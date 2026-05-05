<?php

namespace App\Http\Controllers;

use App\Models\Accommodation;
use App\Models\AccommodationImage;
use App\Models\Room;
use App\Services\RoomPricingService;
use App\Services\ImageUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccommodationController extends Controller
{
    public function index(Request $request)
    {
        $query = Accommodation::with(['host', 'images', 'reviews'])->published();

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->has('city')) {
            $query->byCity($request->city);
        }

        if ($request->has('type')) {
            $query->byType($request->type);
        }

        if ($request->has('min_price') && $request->has('max_price')) {
            $query->priceRange($request->min_price, $request->max_price);
        }

        if ($request->has('featured')) {
            $query->featured();
        }

        // Filtrer par dates et nombre de voyageurs si fournis
        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');
        $guests = $request->get('guests');

        if ($checkIn && $checkOut) {
            // Filtrer les hébergements qui ont au moins une chambre disponible pour ces dates
            $query->whereHas('rooms', function($q) use ($checkIn, $checkOut, $guests) {
                $q->where('is_active', true);
                
                // Filtrer par capacité si nombre de voyageurs spécifié
                if ($guests) {
                    $q->where('capacity', '>=', $guests);
                }
                
                // Exclure les chambres avec des conflits de disponibilité manuelle
                $q->whereDoesntHave('availabilities', function($aq) use ($checkIn, $checkOut) {
                    $aq->whereBetween('date', [$checkIn, $checkOut])
                       ->where('status', '!=', 'available');
                });
                
                // Vérifier qu'il reste au moins une chambre disponible
                // On compare la quantité avec le nombre de réservations confirmées pour ces dates
                $q->whereRaw('COALESCE(quantity, 1) > COALESCE((
                    SELECT COUNT(*) 
                    FROM bookings 
                    WHERE bookings.room_id = rooms.id 
                    AND bookings.status = "confirmed"
                    AND (
                        (bookings.check_in <= ? AND bookings.check_out >= ?)
                        OR (bookings.check_in BETWEEN ? AND ?)
                        OR (bookings.check_out BETWEEN ? AND ?)
                    )
                ), 0)', [$checkOut, $checkIn, $checkIn, $checkOut, $checkIn, $checkOut]);
            });
        } elseif ($guests) {
            // Si seulement le nombre de voyageurs est spécifié (sans dates)
            $query->whereHas('rooms', function($q) use ($guests) {
                $q->where('is_active', true)
                  ->where('capacity', '>=', $guests);
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 12);
        $accommodations = $query->paginate($perPage);

        return response()->json($accommodations);
    }

    public function show(Request $request, $id)
    {
        // Charger les chambres actives avec leurs images pour les visiteurs
        $query = Accommodation::with([
            'host', 
            'images', 
            'reviews.user',
            'rooms' => function($query) {
                $query->active() // Seulement les chambres actives
                      ->with(['images' => function($q) {
                          $q->ordered(); // Images triées
                      }, 'primaryImage']); // Image principale
            }
        ]);

        // If authenticated and is owner or admin, allow viewing regardless of status
        $user = $request->user();
        if ($user && ($user->isAdmin() || Accommodation::where('id', $id)->where('host_id', $user->id)->exists())) {
            // Pour le propriétaire/admin : charger TOUTES les chambres (actives et inactives)
            $accommodation = Accommodation::with([
                'host', 
                'images', 
                'reviews.user',
                'rooms' => function($query) {
                    $query->with(['images' => function($q) {
                        $q->ordered();
                    }, 'primaryImage']);
                }
            ])->findOrFail($id);
        } else {
            // Public: only published accommodations with active rooms
            $accommodation = $query->published()->findOrFail($id);
        }

        return response()->json($accommodation);
    }

    /**
     * Aperçu du prix effectif selon les dates et la politique d'annulation.
     * Utilise la tarification automatique (non remboursable -10%, modifiable +10%, long séjour -15%).
     */
    public function pricePreview(Request $request, $id)
    {
        $accommodation = Accommodation::published()->findOrFail($id);

        $request->validate([
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'room_id' => 'nullable|exists:rooms,id',
        ]);

        $checkIn = $request->check_in;
        $checkOut = $request->check_out;
        $roomId = $request->room_id;

        $nights = \Carbon\Carbon::parse($checkIn)->diffInDays(\Carbon\Carbon::parse($checkOut));
        $cancellationHours = $accommodation->cancellation_policy_hours ?? 48;

        $basePricePerNight = $accommodation->price_per_night;
        $room = null;

        if ($roomId) {
            $room = Room::where('accommodation_id', $id)->where('is_active', true)->find($roomId);
            if ($room) {
                $basePricePerNight = $room->price_per_night;
            }
        }

        $effectivePricePerNight = RoomPricingService::getEffectivePricePerNight(
            (float) $basePricePerNight,
            (int) $cancellationHours,
            $nights,
            $accommodation
        );

        // Déterminer le type de tarif appliqué (selon les plans activés par l'hôte)
        $rateType = 'base';
        $longStayNights = (int) ($accommodation->pricing_long_stay_nights ?? config('room-pricing.long_stay_nights_threshold', 7));
        if ($accommodation->pricing_long_stay_enabled && $nights >= $longStayNights) {
            $rateType = 'long_stay';
        } elseif ($accommodation->pricing_non_refundable_enabled && $cancellationHours === 0) {
            $rateType = 'non_refundable';
        } elseif ($accommodation->pricing_modifiable_enabled && $cancellationHours > 0) {
            $rateType = 'modifiable';
        }

        $total = round($effectivePricePerNight * $nights, 2);
        $variants = RoomPricingService::getPriceVariants((float) $basePricePerNight, $accommodation);

        return response()->json([
            'base_price_per_night' => (float) $basePricePerNight,
            'effective_price_per_night' => $effectivePricePerNight,
            'nights' => $nights,
            'total' => $total,
            'rate_type' => $rateType,
            'cancellation_policy_hours' => $cancellationHours,
            'variants' => $variants,
        ]);
    }

    /**
     * Suggestions d'autocomplétion pour la barre de recherche
     * Retourne villes et noms d'hébergements correspondant à la requête
     */
    public function suggestions(Request $request)
    {
        $q = trim($request->get('q', ''));
        $limit = min((int) $request->get('limit', 8), 15);

        if (strlen($q) < 2) {
            return response()->json(['cities' => [], 'accommodations' => []]);
        }

        $search = '%' . $q . '%';

        // Villes distinctes correspondant à la recherche
        $cities = Accommodation::published()
            ->where('city', 'like', $search)
            ->select('city')
            ->distinct()
            ->orderBy('city')
            ->limit(5)
            ->pluck('city')
            ->values()
            ->toArray();

        // Hébergements correspondant (nom ou ville)
        $accommodations = Accommodation::published()
            ->where(function ($query) use ($search) {
                $query->where('name', 'like', $search)
                    ->orWhere('city', 'like', $search);
            })
            ->select('id', 'name', 'city', 'slug')
            ->orderBy('name')
            ->limit($limit - count($cities))
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'name' => $a->name,
                    'city' => $a->city,
                    'slug' => $a->slug,
                ];
            });

        return response()->json([
            'cities' => $cities,
            'accommodations' => $accommodations,
        ]);
    }

    /**
     * Récupérer les établissements de la même ville (pour suggestions)
     * Route publique - accessible sans authentification
     */
    public function getSimilarByCity(Request $request, $id)
    {
        // Récupérer l'établissement (même s'il n'est pas publié, on peut quand même suggérer d'autres établissements)
        $accommodation = Accommodation::findOrFail($id);
        
        // Si l'établissement n'a pas de ville, retourner un tableau vide
        if (!$accommodation->city) {
            return response()->json([]);
        }
        
        // Récupérer les établissements de la même ville, publiés uniquement, excluant l'établissement actuel
        $similar = Accommodation::with(['images'])
            ->published() // Seulement les établissements publiés
            ->where('city', $accommodation->city)
            ->where('id', '!=', $id)
            ->orderBy('rating', 'desc') // Trier par note décroissante
            ->orderBy('created_at', 'desc') // Puis par date de création
            ->limit(6) // Limiter à 6 suggestions
            ->get();

        return response()->json($similar);
    }

    public function uploadMedia(Request $request, $id, ImageUploadService $uploadService)
    {
        $mediaLog = \Log::channel('media_upload');
        
        $mediaLog->info("=== UPLOAD MEDIA REQUEST START ===", [
            'accommodation_id' => $id,
            'user_id' => $request->user()?->id,
            'has_files' => $request->hasFile('media'),
        ]);

        try {
            $accommodation = Accommodation::findOrFail($id);
        } catch (\Exception $e) {
            $mediaLog->error("Accommodation not found", ['id' => $id]);
            return response()->json(['message' => 'Hébergement non trouvé'], 404);
        }

        if (!$request->user()) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        if ($accommodation->host_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Permission refusée'], 403);
        }

        // Récupérer les fichiers
        $mediaFiles = $request->file('media', []);
        if (empty($mediaFiles)) {
            $mediaFiles = $request->file('media[]', []);
        }
        if (!is_array($mediaFiles)) {
            $mediaFiles = $mediaFiles ? [$mediaFiles] : [];
        }
        $mediaFiles = array_values(array_filter($mediaFiles, fn($f) => $f instanceof \Illuminate\Http\UploadedFile));
        
        if (empty($mediaFiles)) {
            return response()->json(['message' => 'Aucun fichier fourni'], 422);
        }

        // Limiter à 10 fichiers
        $existingCount = $accommodation->images()->count();
        if (($existingCount + count($mediaFiles)) > 10) {
            return response()->json(['message' => 'Maximum 10 fichiers par hébergement'], 422);
        }

        $saved = [];
        $errors = [];

        foreach ($mediaFiles as $index => $file) {
            try {
                if (!$file || !$file->isValid()) {
                    $errors[] = "Fichier invalide à l'index {$index}";
                    continue;
                }

                $mime = $file->getMimeType();
                $isImage = str_starts_with($mime, 'image/');
                $isVideo = str_starts_with($mime, 'video/');

                // Types autorisés
                if (!$isImage && !$isVideo) {
                    $errors[] = "Type non autorisé à l'index {$index}";
                    continue;
                }

                // Validation taille
                if ($file->getSize() > 10 * 1024 * 1024) {
                    $errors[] = "Fichier trop volumineux à l'index {$index} (max 10MB)";
                    continue;
                }

                if ($isImage) {
                    // Upload via le service pour les images (avec compression auto)
                    $result = $uploadService->upload($file, "accommodations/{$accommodation->id}", 'acc');
                    $fullUrl = $result['full_url'];
                } else {
                    // Upload direct pour les vidéos (pas de compression)
                    $dir = "accommodations/{$accommodation->id}";
                    if (!Storage::disk('public')->directoryExists($dir)) {
                        Storage::disk('public')->makeDirectory($dir);
                    }
                    $path = $file->store($dir, 'public');
                    $fullUrl = asset(Storage::url($path));
                    
                    // Fallback public/storage
                    try {
                        $publicPath = public_path('storage/' . $path);
                        File::ensureDirectoryExists(dirname($publicPath));
                        File::copy(Storage::disk('public')->path($path), $publicPath);
                    } catch (\Exception $e) {
                        $mediaLog->warning("Copy to public/storage failed", ['path' => $path]);
                    }
                }

                $mediaLog->info("File uploaded", [
                    'index' => $index,
                    'mime' => $mime,
                    'url' => $fullUrl,
                ]);

                $image = AccommodationImage::create([
                    'accommodation_id' => $accommodation->id,
                    'url' => $fullUrl,
                    'is_primary' => $existingCount === 0 && $index === 0,
                    'order' => $existingCount + $index + 1,
                ]);

                $saved[] = $image;
            } catch (\Exception $e) {
                $errors[] = "Erreur index {$index}: " . $e->getMessage();
                $mediaLog->error("Upload failed", ['index' => $index, 'error' => $e->getMessage()]);
            }
        }

        if (empty($saved) && !empty($errors)) {
            return response()->json([
                'message' => 'Aucun fichier uploadé',
                'errors' => $errors
            ], 422);
        }

        return response()->json([
            'data' => $saved,
            'message' => count($saved) . ' fichier(s) uploadé(s)',
            'errors' => $errors
        ], 201);
    }

    /**
     * Supprimer une image d'un établissement
     */
    public function deleteMedia(Request $request, $accommodationId, $imageId, ImageUploadService $uploadService)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        if ($accommodation->host_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $image = AccommodationImage::where('accommodation_id', $accommodationId)
            ->where('id', $imageId)
            ->firstOrFail();

        // Supprimer via le service
        $uploadService->delete($image->url, true);

        $wasPrimary = $image->is_primary;
        $image->delete();

        // Si c'était l'image principale, en définir une nouvelle
        if ($wasPrimary) {
            $nextImage = AccommodationImage::where('accommodation_id', $accommodationId)
                ->orderBy('order')
                ->orderBy('id')
                ->first();

            if ($nextImage) {
                $nextImage->is_primary = true;
                $nextImage->save();
            }
        }

        return response()->json(['message' => 'Image supprimée avec succès']);
    }

    /**
     * Définir une image comme image principale
     */
    public function setPrimaryMedia(Request $request, $accommodationId, $imageId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        // Autorisations : propriétaire ou admin
        if ($accommodation->host_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $image = AccommodationImage::where('accommodation_id', $accommodationId)
            ->where('id', $imageId)
            ->firstOrFail();

        // Mettre toutes les autres images en non-principales
        AccommodationImage::where('accommodation_id', $accommodationId)
            ->update(['is_primary' => false]);

        $image->is_primary = true;
        $image->save();

        return response()->json([
            'message' => 'Image principale mise à jour avec succès',
            'data' => $image,
        ]);
    }

    public function store(Request $request)
    {
        // Vérifier que le profil hôte est complet et vérifié
        $user = $request->user();
        Log::info('Accommodation store request received', [
            'user_id' => $user?->id,
            'profile_completed' => $user?->profile_completed,
            'profile_verified' => $user?->profile_verified,
            'payload_preview' => $request->only([
                'name', 'type', 'city', 'price_per_night', 'max_guests'
            ]),
        ]);

        if (!$user->profile_completed) {
            Log::warning('Accommodation creation blocked: profile not completed', [
                'user_id' => $user->id,
            ]);
            return response()->json([
                'message' => 'Votre profil doit être complété à 100% avant de pouvoir ajouter un hébergement. Veuillez compléter votre profil dans la section "Profil".',
                'profile_completion_required' => true
            ], 403);
        }

        if (!$user->profile_verified) {
            Log::warning('Accommodation creation blocked: profile awaiting verification', [
                'user_id' => $user->id,
            ]);
            return response()->json([
                'message' => 'Votre profil est en attente de vérification par l\'administrateur. Vous pourrez ajouter des hébergements une fois votre profil vérifié.',
                'profile_verification_required' => true
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:hotel,lodge,guesthouse,apartment',
            'description' => 'required|string',
            'description_en' => 'nullable|string',
            'address' => 'required|string',
            'city' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'price_per_night' => 'required|numeric|min:0',
            'max_guests' => 'required|integer|min:1',
            'bedrooms' => 'required|integer|min:0',
            'bathrooms' => 'required|integer|min:0',
            'amenities' => 'nullable|array',
            // Nouveaux champs
            'opening_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'star_rating' => 'nullable|integer|min:1|max:5',
            'standing' => 'nullable|string|in:luxury,standard,economy',
            'room_types' => 'nullable|array',
            'room_type_pricing' => 'nullable|array',
            'room_type_pricing.*.type' => 'required_with:room_type_pricing|string|max:255',
            'room_type_pricing.*.price_per_night' => 'required_with:room_type_pricing|numeric|min:0',
            'room_type_pricing.*.rooms_available' => 'nullable|integer|min:0',
            'room_type_pricing' => 'nullable|array',
            'room_type_pricing.*.type' => 'required_with:room_type_pricing|string|max:255',
            'room_type_pricing.*.price_per_night' => 'required_with:room_type_pricing|numeric|min:0',
            'room_type_pricing.*.rooms_available' => 'nullable|integer|min:0',
            'conference_rooms_count' => 'nullable|integer|min:0',
            'conference_capacity' => 'nullable|integer|min:0',
            'restaurant_capacity' => 'nullable|integer|min:0',
            'bar_capacity' => 'nullable|integer|min:0',
            'shuttle_service' => 'nullable|boolean',
            'laundry' => 'nullable|boolean',
            'breakfast_price' => 'nullable|numeric|min:0',
            'reception_24h' => 'nullable|boolean',
            'smoking_area' => 'nullable|boolean',
            'pets_allowed' => 'nullable|boolean',
            'other_amenities' => 'nullable|string|max:1000',
            'deposit_required' => 'nullable|boolean',
            'deposit_amount' => 'nullable|string|in:first_night,percentage,fixed',
            'cancellation_policy_hours' => 'nullable|integer|min:0',
            'payment_methods' => 'nullable|array',
            'special_conditions' => 'nullable|string|max:2000',
            'breakfast_included' => 'nullable|boolean',
            'breakfast_included_persons' => 'nullable|integer|min:0|max:10',
            'check_in_time' => 'nullable|date_format:H:i',
            'check_out_time' => 'nullable|date_format:H:i',
            'invoice_paid_before_hours' => 'nullable|integer|min:0',
        ]);

        // Sécurité: empêcher la création de doublons pour le même hôte
        $duplicate = Accommodation::where('host_id', $user->id)
            ->whereRaw('LOWER(name) = LOWER(?)', [$request->name])
            ->whereRaw('LOWER(city) = LOWER(?)', [$request->city])
            ->whereNotIn('status', ['removed'])
            ->first();

        if ($duplicate) {
            return response()->json([
                'message' => 'Vous avez déjà enregistré un établissement avec ce nom dans cette ville. Veuillez modifier l\'établissement existant ou choisir un autre nom.',
                'existing_id' => $duplicate->id,
            ], 422);
        }

        Log::info('Accommodation request validated successfully', [
            'user_id' => $user->id,
            'amenities_count' => is_array($request->amenities) ? count($request->amenities) : 0,
            'room_types_count' => is_array($request->room_types) ? count($request->room_types) : 0,
        ]);

        // Générer un slug unique
        $baseSlug = \Str::slug($request->name);
        $slug = $baseSlug;
        $counter = 1;
        while (Accommodation::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        $accommodation = Accommodation::create([
            'host_id' => $request->user()->id,
            'name' => $request->name,
            'slug' => $slug,
            'type' => $request->type,
            'description' => $request->description,
            'description_en' => $request->description_en,
            'address' => $request->address,
            'city' => $request->city,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'price_per_night' => $request->price_per_night,
            'max_guests' => $request->max_guests,
            'bedrooms' => $request->bedrooms,
            'bathrooms' => $request->bathrooms,
            'amenities' => $request->amenities ?? [],
            'status' => 'pending',
            // Nouveaux champs
            'opening_year' => $request->opening_year,
            'star_rating' => $request->star_rating,
            'standing' => $request->standing,
            'room_types' => $request->room_types ?? [],
            'room_type_pricing' => $request->room_type_pricing ?? [],
            'conference_rooms_count' => $request->conference_rooms_count ?? 0,
            'conference_capacity' => $request->conference_capacity ?? 0,
            'restaurant_capacity' => $request->restaurant_capacity ?? 0,
            'bar_capacity' => $request->bar_capacity ?? 0,
            'shuttle_service' => $request->boolean('shuttle_service', false),
            'laundry' => $request->boolean('laundry', false),
            'breakfast_price' => $request->breakfast_price,
            'reception_24h' => $request->boolean('reception_24h', false),
            'smoking_area' => $request->boolean('smoking_area', false),
            'pets_allowed' => $request->boolean('pets_allowed', false),
            'other_amenities' => $request->other_amenities,
            'deposit_required' => $request->boolean('deposit_required', true),
            'deposit_amount' => $request->deposit_amount ?? 'first_night',
            'cancellation_policy_hours' => $request->cancellation_policy_hours ?? 48,
            'payment_methods' => $request->payment_methods ?? [],
            'special_conditions' => $request->special_conditions,
            'breakfast_included' => $request->boolean('breakfast_included', false),
            'breakfast_included_persons' => $request->breakfast_included_persons ?? 0,
            'check_in_time' => $request->check_in_time,
            'check_out_time' => $request->check_out_time,
            'invoice_paid_before_hours' => $request->invoice_paid_before_hours ?? 48,
        ]);

        Log::info('Accommodation created successfully', [
            'accommodation_id' => $accommodation->id,
            'user_id' => $user->id,
            'slug' => $accommodation->slug,
        ]);

        return response()->json($accommodation, 201);
    }

    public function update(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);

        if ($accommodation->host_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:hotel,lodge,guesthouse,apartment',
            'description' => 'sometimes|string',
            'description_en' => 'nullable|string',
            'address' => 'sometimes|string',
            'city' => 'sometimes|string',
            'latitude' => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric',
            'price_per_night' => 'sometimes|numeric|min:0',
            'max_guests' => 'sometimes|integer|min:1',
            'bedrooms' => 'sometimes|integer|min:0',
            'bathrooms' => 'sometimes|integer|min:0',
            'amenities' => 'nullable|array',
            'status' => 'sometimes|string|in:pending,published,rejected,unavailable,renovation',
            // Nouveaux champs
            'opening_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'star_rating' => 'nullable|integer|min:1|max:5',
            'standing' => 'nullable|string|in:luxury,standard,economy',
            'room_types' => 'nullable|array',
            'conference_rooms_count' => 'nullable|integer|min:0',
            'conference_capacity' => 'nullable|integer|min:0',
            'restaurant_capacity' => 'nullable|integer|min:0',
            'bar_capacity' => 'nullable|integer|min:0',
            'shuttle_service' => 'nullable|boolean',
            'laundry' => 'nullable|boolean',
            'breakfast_price' => 'nullable|numeric|min:0',
            'reception_24h' => 'nullable|boolean',
            'smoking_area' => 'nullable|boolean',
            'pets_allowed' => 'nullable|boolean',
            'other_amenities' => 'nullable|string|max:1000',
            'deposit_required' => 'nullable|boolean',
            'deposit_amount' => 'nullable|string|in:first_night,percentage,fixed',
            'cancellation_policy_hours' => 'nullable|integer|min:0',
            'payment_methods' => 'nullable|array',
            'special_conditions' => 'nullable|string|max:2000',
            'breakfast_included' => 'nullable|boolean',
            'breakfast_included_persons' => 'nullable|integer|min:0|max:10',
            'check_in_time' => 'nullable|date_format:H:i',
            'check_out_time' => 'nullable|date_format:H:i',
            'invoice_paid_before_hours' => 'nullable|integer|min:0',
            'pricing_auto_enabled' => 'nullable|boolean',
            'pricing_non_refundable_enabled' => 'nullable|boolean',
            'pricing_non_refundable_discount' => 'nullable|numeric|min:0|max:100',
            'pricing_modifiable_enabled' => 'nullable|boolean',
            'pricing_modifiable_surcharge' => 'nullable|numeric|min:0|max:100',
            'pricing_long_stay_enabled' => 'nullable|boolean',
            'pricing_long_stay_discount' => 'nullable|numeric|min:0|max:100',
            'pricing_long_stay_nights' => 'nullable|integer|min:1|max:90',
        ]);

        // Only admin can set published/rejected
        if ($request->has('status') && in_array($request->status, ['published', 'rejected'], true) && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only admin can set this status'], 403);
        }

        $updateData = $request->only([
            'name', 'type', 'description', 'description_en', 'address', 'city',
            'latitude', 'longitude', 'price_per_night', 'max_guests',
            'bedrooms', 'bathrooms', 'amenities', 'status',
            // Nouveaux champs
            'opening_year', 'star_rating', 'standing', 'room_types', 'room_type_pricing',
            'conference_rooms_count', 'conference_capacity',
            'restaurant_capacity', 'bar_capacity',
            'shuttle_service', 'laundry', 'breakfast_price',
            'reception_24h', 'smoking_area', 'pets_allowed',
            'other_amenities', 'deposit_required', 'deposit_amount',
            'cancellation_policy_hours', 'payment_methods',
            'special_conditions', 'breakfast_included',
            'breakfast_included_persons', 'check_in_time',
            'check_out_time', 'invoice_paid_before_hours',
            'pricing_auto_enabled', 'pricing_non_refundable_enabled',
            'pricing_non_refundable_discount', 'pricing_modifiable_enabled',
            'pricing_modifiable_surcharge', 'pricing_long_stay_enabled',
            'pricing_long_stay_discount', 'pricing_long_stay_nights',
        ]);

        // Convertir les valeurs boolean si elles sont présentes
        if ($request->has('shuttle_service')) {
            $updateData['shuttle_service'] = $request->boolean('shuttle_service');
        }
        if ($request->has('laundry')) {
            $updateData['laundry'] = $request->boolean('laundry');
        }
        if ($request->has('reception_24h')) {
            $updateData['reception_24h'] = $request->boolean('reception_24h');
        }
        if ($request->has('smoking_area')) {
            $updateData['smoking_area'] = $request->boolean('smoking_area');
        }
        if ($request->has('pets_allowed')) {
            $updateData['pets_allowed'] = $request->boolean('pets_allowed');
        }
        if ($request->has('deposit_required')) {
            $updateData['deposit_required'] = $request->boolean('deposit_required');
        }
        if ($request->has('breakfast_included')) {
            $updateData['breakfast_included'] = $request->boolean('breakfast_included');
        }
        if ($request->has('pricing_auto_enabled')) {
            $updateData['pricing_auto_enabled'] = $request->boolean('pricing_auto_enabled');
        }
        if ($request->has('pricing_non_refundable_enabled')) {
            $updateData['pricing_non_refundable_enabled'] = $request->boolean('pricing_non_refundable_enabled');
        }
        if ($request->has('pricing_modifiable_enabled')) {
            $updateData['pricing_modifiable_enabled'] = $request->boolean('pricing_modifiable_enabled');
        }
        if ($request->has('pricing_long_stay_enabled')) {
            $updateData['pricing_long_stay_enabled'] = $request->boolean('pricing_long_stay_enabled');
        }

        $accommodation->update($updateData);

        if ($request->has('name')) {
            // Générer un slug unique si le nom a changé
            $baseSlug = \Str::slug($request->name);
            $slug = $baseSlug;
            $counter = 1;
            
            // Vérifier si le slug existe déjà (sauf pour l'accommodation actuelle)
            while (Accommodation::where('slug', $slug)->where('id', '!=', $accommodation->id)->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }
            
            $accommodation->slug = $slug;
            $accommodation->save();
        }

        return response()->json($accommodation);
    }

    public function destroy(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);

        if ($accommodation->host_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Seuls les établissements non actifs peuvent être supprimés
        if ($accommodation->status === 'published') {
            return response()->json([
                'message' => 'Impossible de supprimer un établissement publié. Passez-le en "Indisponible" ou "En attente" avant de le supprimer.',
            ], 422);
        }

        $hasFutureBookings = $accommodation->bookings()
            ->whereIn('status', ['confirmed', 'pending'])
            ->where('check_out', '>=', now()->startOfDay()->toDateString())
            ->exists();

        if ($hasFutureBookings) {
            return response()->json([
                'message' => 'Impossible de supprimer : des réservations à venir existent pour cet établissement.',
            ], 422);
        }

        $accommodation->delete();

        return response()->json(['message' => 'Accommodation deleted successfully']);
    }

    public function myAccommodations(Request $request)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = Accommodation::where('host_id', $request->user()->id)
            ->with(['images', 'bookings' => function($q) {
                $q->where('status', 'confirmed');
            }])
            ->withCount(['bookings' => function($q) {
                $q->where('status', 'confirmed');
            }])
            ->withCount([
                'rooms as total_rooms_count',
                'rooms as active_rooms_count' => function($q) {
                    $q->where('is_active', true);
                },
                'rooms as inactive_rooms_count' => function($q) {
                    $q->where('is_active', false);
                }
            ]);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $accommodations = $query->get();

        return response()->json($accommodations);
    }
}

