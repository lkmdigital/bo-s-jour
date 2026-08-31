<?php

namespace App\Http\Controllers;

use App\Models\Accommodation;
use App\Models\AccommodationImage;
use App\Models\Room;
use App\Services\RoomPricingService;
use App\Services\ImageUploadService;
use App\Support\Security\SensitiveUserFields;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccommodationController extends Controller
{
    /**
     * Un avis public affiche l'auteur (nom, avatar) — jamais ses coordonnées de contact,
     * qui n'ont rien à faire sur une page d'hébergement consultée par n'importe qui.
     */
    private function hideReviewerSensitiveFields($accommodation): void
    {
        foreach ($accommodation->reviews as $review) {
            $review->user?->makeHidden(SensitiveUserFields::DOCUMENTS_FINANCIAL_AND_CONTACT);
        }
    }

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

        if ($request->filled('subtype')) {
            $query->bySubtype($request->subtype);
        }

        // Prix (bornes indépendantes)
        if ($request->filled('min_price')) {
            $query->where('price_per_night', '>=', (float) $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price_per_night', '<=', (float) $request->max_price);
        }

        // Note minimale
        if ($request->filled('min_rating')) {
            $query->where('rating', '>=', (float) $request->min_rating);
        }

        // Services / équipements (tous requis). Comparaison insensible à la casse via
        // une recherche texte sur le JSON brut plutôt que whereJsonContains (comparaison
        // stricte) : robuste si un hôte a saisi "wi-fi" au lieu de "Wi-Fi" par exemple.
        if ($request->filled('amenities')) {
            foreach (array_filter(array_map('trim', explode(',', $request->amenities))) as $amenity) {
                $query->whereRaw('LOWER(amenities) LIKE ?', ['%"' . mb_strtolower($amenity) . '"%']);
            }
        }

        // Politique d'annulation -> heures (Flexible 48h / Modérée 24h / Stricte 0h)
        if ($request->filled('cancellation_policy')) {
            $policy = \Illuminate\Support\Str::lower($request->cancellation_policy);
            $map = ['flexible' => 48, 'modérée' => 24, 'moderee' => 24, 'stricte' => 0];
            if (array_key_exists($policy, $map)) {
                $query->where('cancellation_policy_hours', $map[$policy]);
            }
        }

        if ($request->has('featured')) {
            // Les offres promotionnelles (établissements "featured") sont réservées aux
            // voyageurs inscrits — c'est un levier d'inscription volontaire, pas une
            // simple mise en avant marketing. $request->user() se résout depuis le
            // Bearer token même sur cette route publique (guard par défaut = sanctum),
            // sans middleware auth:sanctum nécessaire.
            if (!$request->user()) {
                return response()->json([
                    'message' => 'Créez votre compte ou connectez-vous pour découvrir nos offres promotionnelles.',
                    'requires_auth' => true,
                ], 401);
            }
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

        // Tri (mapping depuis le paramètre `sort` du front)
        switch ($request->get('sort')) {
            case 'price_asc':   $query->orderBy('price_per_night', 'asc'); break;
            case 'price_desc':  $query->orderBy('price_per_night', 'desc'); break;
            case 'rating':      $query->orderBy('rating', 'desc'); break;
            case 'recommended': $query->orderBy('is_featured', 'desc')->orderBy('rating', 'desc'); break;
            default:
                $sortBy = $request->get('sort_by', 'created_at');
                $sortOrder = $request->get('sort_order', 'desc');
                $query->orderBy($sortBy, $sortOrder);
        }

        $perPage = $request->get('per_page', 12);
        $accommodations = $query->paginate($perPage);

        // Endpoint public (aucune authentification requise) : jamais les données
        // sensibles de l'hôte (documents, coordonnées bancaires, identifiants fiscaux).
        foreach ($accommodations->getCollection() as $accommodation) {
            $accommodation->host?->makeHidden(SensitiveUserFields::DOCUMENTS_AND_FINANCIAL);
        }

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
        if ($user && ($user->isAdmin() || Accommodation::where('id', $id)->where('host_id', $user->hostScopeId())->exists())) {
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
            // Endpoint public (aucune authentification requise) : jamais les données
            // sensibles de l'hôte. La branche propriétaire/admin ci-dessus garde un accès
            // complet, légitime (voir /dashboard/admin/accommodations/{id} et le profil hôte).
            $accommodation->host?->makeHidden(SensitiveUserFields::DOCUMENTS_AND_FINANCIAL);
        }

        // Un avis affiche son auteur (nom, avatar) — jamais ses coordonnées de contact ni
        // ses documents, quel que soit qui consulte la fiche (public, hôte ou admin) : cette
        // page n'a jamais eu vocation à exposer les données d'un voyageur tiers.
        $this->hideReviewerSensitiveFields($accommodation);

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
                // Tarification par période : prix moyen par nuit selon les périodes
                // tarifaires programmées par l'hôte (sinon tarif de base)
                $basePricePerNight = RoomPricingService::getAverageBasePricePerNight(
                    $room,
                    $checkIn,
                    $checkOut
                );
            }
        }

        $effectivePricePerNight = RoomPricingService::getEffectivePricePerNight(
            (float) $basePricePerNight,
            (int) $cancellationHours,
            $nights,
            $accommodation,
            $checkIn
        );

        // Déterminer le type de tarif appliqué (selon les plans activés par l'hôte)
        $rateType = 'base';
        $longStayNights = (int) ($accommodation->pricing_long_stay_nights ?? config('room-pricing.long_stay_nights_threshold', 7));
        $hoursUntilCheckIn = now()->diffInHours(\Carbon\Carbon::parse($checkIn), false);
        if ($accommodation->pricing_long_stay_enabled && $nights >= $longStayNights) {
            $rateType = 'long_stay';
        } elseif ($accommodation->pricing_non_refundable_enabled && $cancellationHours === 0) {
            $rateType = 'non_refundable';
        } elseif ($accommodation->pricing_modifiable_enabled && $cancellationHours > 0 && $hoursUntilCheckIn >= $cancellationHours) {
            $rateType = 'modifiable';
        }

        $total = round($effectivePricePerNight * $nights, 2);
        $variants = RoomPricingService::getPriceVariants((float) $basePricePerNight, $accommodation);
        $paymentOptions = \App\Services\PaymentOptionsService::previewPaymentOptions(
            $total, $checkIn, $checkOut, (int) $cancellationHours
        );

        return response()->json([
            'base_price_per_night' => (float) $basePricePerNight,
            'effective_price_per_night' => $effectivePricePerNight,
            'nights' => $nights,
            'total' => $total,
            'rate_type' => $rateType,
            'cancellation_policy_hours' => $cancellationHours,
            'variants' => $variants,
            'payment_options' => $paymentOptions,
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

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
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

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
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
        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
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
        // Vérifier que le profil hôte est complet et vérifié — pour un compte staff,
        // c'est la conformité du PROPRIÉTAIRE qui compte, pas celle du collaborateur.
        $user = $request->user();
        $complianceUser = $user->isStaff() ? ($user->staffOwner ?? $user) : $user;
        Log::info('Accommodation store request received', [
            'user_id' => $user?->id,
            'profile_completed' => $complianceUser?->profile_completed,
            'profile_verified' => $complianceUser?->profile_verified,
            'payload_preview' => $request->only([
                'name', 'type', 'city', 'price_per_night', 'max_guests'
            ]),
        ]);

        if (!$complianceUser->profile_completed) {
            Log::warning('Accommodation creation blocked: profile not completed', [
                'user_id' => $user->id,
            ]);
            return response()->json([
                'message' => 'Votre profil doit être complété à 100% avant de pouvoir ajouter un hébergement. Veuillez compléter votre profil dans la section "Profil".',
                'profile_completion_required' => true
            ], 403);
        }

        if (!$complianceUser->profile_verified) {
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
            'whatsapp' => 'nullable|string|max:20|regex:/^[\+]?[0-9\s\-\(\)]+$/',
            'type' => 'required|string|in:hotel,lodge,guesthouse,apartment,other',
            'subtype' => ['nullable', 'string', 'max:30', function ($attribute, $value, $fail) use ($request) {
                $allowed = Accommodation::SUBTYPES[$request->type] ?? [];
                if ($value && !array_key_exists($value, $allowed)) {
                    $fail("Cette sous-catégorie n'est pas valide pour ce type d'établissement.");
                }
            }],
            'type_other_label' => 'required_if:type,other|nullable|string|max:191',
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
        $duplicate = Accommodation::where('host_id', $user->hostScopeId())
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
            'host_id' => $request->user()->hostScopeId(),
            'name' => $request->name,
            'whatsapp' => $request->whatsapp,
            'slug' => $slug,
            'type' => $request->type,
            'subtype' => $request->type === 'other' ? null : $request->subtype,
            'type_other_label' => $request->type === 'other' ? $request->type_other_label : null,
            'establishment_code' => Accommodation::generateEstablishmentCode(),
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

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'whatsapp' => 'nullable|string|max:20|regex:/^[\+]?[0-9\s\-\(\)]+$/',
            'type' => 'sometimes|string|in:hotel,lodge,guesthouse,apartment,other',
            'subtype' => ['nullable', 'string', 'max:30', function ($attribute, $value, $fail) use ($request, $accommodation) {
                $type = $request->input('type', $accommodation->type);
                $allowed = Accommodation::SUBTYPES[$type] ?? [];
                if ($value && !array_key_exists($value, $allowed)) {
                    $fail("Cette sous-catégorie n'est pas valide pour ce type d'établissement.");
                }
            }],
            'type_other_label' => 'nullable|string|max:191',
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
            'loyalty_program_joined' => 'nullable|boolean',
        ]);

        // Only admin can set published/rejected
        if ($request->has('status') && in_array($request->status, ['published', 'rejected'], true) && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only admin can set this status'], 403);
        }

        $updateData = $request->only([
            'name', 'whatsapp', 'type', 'subtype', 'type_other_label', 'description', 'description_en', 'address', 'city',
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

        // Cohérence type / sous-catégorie / libellé libre
        $effectiveType = $request->input('type', $accommodation->type);
        if ($effectiveType === 'other') {
            $updateData['subtype'] = null;
        } elseif ($request->has('type') || $request->has('subtype')) {
            $updateData['type_other_label'] = null;
        }

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

        // Participation au programme de fidélité : décision de l'hôte, pas un
        // simple passthrough (le client n'envoie qu'un booléen, jamais la date
        // elle-même) — on horodate à l'adhésion, on efface au retrait.
        if ($request->has('loyalty_program_joined')) {
            $updateData['loyalty_program_joined_at'] = $request->boolean('loyalty_program_joined')
                ? ($accommodation->loyalty_program_joined_at ?? now())
                : null;
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

    /**
     * Checklist de publication (brief Extranet Partenaire, Étape 21) : ce qu'il manque
     * avant que l'hôte puisse soumettre l'établissement à la revue admin.
     */
    public function readiness(Request $request, $id)
    {
        $accommodation = Accommodation::with('images')->findOrFail($id);

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $checks = [
            'photos' => [
                'label' => 'Au moins 5 photos',
                'ok' => $accommodation->images->count() >= 5,
            ],
            'price' => [
                'label' => 'Prix par nuit défini',
                'ok' => (float) $accommodation->price_per_night > 0,
            ],
            'cancellation_policy' => [
                'label' => "Politique d'annulation choisie",
                'ok' => $accommodation->cancellation_policy_hours !== null,
            ],
            'whatsapp' => [
                'label' => "Numéro WhatsApp de l'établissement renseigné",
                'ok' => !empty($accommodation->whatsapp),
            ],
            'bank_details' => [
                'label' => 'Coordonnées bancaires renseignées (pour les reversements)',
                'ok' => $accommodation->host?->hasBankDetails() ?? false,
            ],
        ];

        $ready = collect($checks)->every(fn ($c) => $c['ok']);

        return response()->json([
            'ready' => $ready,
            'checks' => $checks,
            'submitted_for_review_at' => $accommodation->submitted_for_review_at,
            'status' => $accommodation->status,
        ]);
    }

    /**
     * Action hôte "Publier mon établissement" : revalide la checklist côté serveur
     * puis marque l'établissement comme prêt pour la revue admin (le statut reste
     * "pending" — seul un admin peut le faire passer "published", cf. update()).
     */
    public function submitForReview(Request $request, $id)
    {
        $accommodation = Accommodation::with('images')->findOrFail($id);

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $missing = [];
        if ($accommodation->images->count() < 5) {
            $missing[] = 'Au moins 5 photos sont requises.';
        }
        if ((float) $accommodation->price_per_night <= 0) {
            $missing[] = 'Le prix par nuit doit être défini.';
        }
        if ($accommodation->cancellation_policy_hours === null) {
            $missing[] = "La politique d'annulation doit être choisie.";
        }
        if (empty($accommodation->whatsapp)) {
            $missing[] = "Le numéro WhatsApp de l'établissement est requis.";
        }
        if (!($accommodation->host?->hasBankDetails() ?? false)) {
            $missing[] = 'Les coordonnées bancaires (RIB) doivent être renseignées dans votre profil.';
        }

        if (!empty($missing)) {
            return response()->json([
                'message' => 'Établissement non prêt pour publication.',
                'missing' => $missing,
            ], 422);
        }

        $accommodation->submitted_for_review_at = now();
        $accommodation->save();

        return response()->json([
            'message' => 'Établissement soumis à la revue de notre équipe.',
            'submitted_for_review_at' => $accommodation->submitted_for_review_at,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
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

        $query = Accommodation::where('host_id', $request->user()->hostScopeId())
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

