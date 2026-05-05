<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\Accommodation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use App\Services\ImageUploadService;
use Intervention\Image\ImageManager;

class RoomController extends Controller
{
    public function index(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        
        $query = Room::where('accommodation_id', $accommodationId)
            ->with(['availabilities', 'images', 'primaryImage']);

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Admin et propriétaire voient toutes les chambres (actives et inactives)
        // Autres utilisateurs voient seulement les chambres actives
        if (!$isAdmin && !$isHostOwner) {
            $query->active();
        }

        $rooms = $query->get();

        return response()->json($rooms);
    }

    public function show($accommodationId, $id)
    {
        $room = Room::with(['accommodation', 'availabilities', 'images', 'primaryImage', 'activePromotions'])
            ->where('accommodation_id', $accommodationId)
            ->findOrFail($id);
        
        return response()->json($room);
    }

    /**
     * Liste publique des chambres d'un établissement avec filtrage par dates
     * Route: GET /api/accommodations/{accommodationId}/rooms
     * Query params: check_in, check_out, guests (optionnels)
     */
    public function indexPublic(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        
        // Vérifier que l'établissement est publié
        if ($accommodation->status !== 'published') {
            return response()->json(['message' => 'Accommodation not available'], 404);
        }
        
        $query = Room::where('accommodation_id', $accommodationId)
            ->where('is_active', true) // Seulement les chambres actives
            ->with(['images' => function($q) {
                $q->orderBy('is_primary', 'desc')->orderBy('sort_order');
            }, 'primaryImage']);
        
        // Filtrer par dates si fournies
        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');
        $guests = $request->get('guests');
        
        if ($checkIn && $checkOut) {
            // Vérifier la disponibilité des chambres pour ces dates
            $query->whereDoesntHave('availabilities', function($q) use ($checkIn, $checkOut) {
                $q->whereBetween('date', [$checkIn, $checkOut])
                  ->where('status', '!=', 'available');
            });
        }
        
        // Filtrer par capacité si spécifiée
        if ($guests) {
            $query->where('capacity', '>=', $guests);
        }
        
        $rooms = $query->get();
        
        // Ajouter l'information de disponibilité pour chaque chambre
        $rooms->transform(function($room) use ($checkIn, $checkOut) {
            $room->quantity = $room->quantity ?? 1; // Par défaut 1
            if ($checkIn && $checkOut) {
                $availableCount = $this->checkRoomAvailability($room->id, $checkIn, $checkOut);
                $room->available_quantity = $availableCount;
                $room->is_available = $availableCount > 0;
            } else {
                $room->available_quantity = $room->quantity;
                $room->is_available = true;
            }
            return $room;
        });
        
        return response()->json($rooms);
    }
    
    /**
     * Afficher une chambre spécifique d'un établissement (route publique)
     * Route: GET /api/accommodations/{accommodationId}/rooms/{id}
     */
    public function showPublic(Request $request, $accommodationId, $id)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        
        // Vérifier que l'établissement est publié
        if ($accommodation->status !== 'published') {
            return response()->json(['message' => 'Accommodation not available'], 404);
        }
        
        $room = Room::with(['accommodation', 'images' => function($q) {
                $q->orderBy('is_primary', 'desc')->orderBy('sort_order');
            }, 'primaryImage'])
            ->where('accommodation_id', $accommodationId)
            ->where('is_active', true)
            ->findOrFail($id);
        
        // Vérifier la disponibilité si dates fournies
        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');
        if ($checkIn && $checkOut) {
            $room->is_available = $this->checkRoomAvailability($room->id, $checkIn, $checkOut);
        } else {
            $room->is_available = true;
        }
        
        return response()->json($room);
    }
    
    /**
     * Afficher une chambre par son ID uniquement (route publique simplifiée)
     * Utilisée pour la page de détails /rooms/{id}
     */
    public function showPublicById(Request $request, $id)
    {
        $room = Room::with(['accommodation', 'images' => function($q) {
                $q->orderBy('is_primary', 'desc')->orderBy('sort_order');
            }, 'primaryImage'])
            ->where('is_active', true)
            ->findOrFail($id);
        
        // Vérifier que l'établissement parent est publié
        if ($room->accommodation && $room->accommodation->status !== 'published') {
            return response()->json(['message' => 'Accommodation not available'], 404);
        }
        
        // Vérifier la disponibilité si dates fournies
        $room->quantity = $room->quantity ?? 1;
        $checkIn = $request->get('check_in');
        $checkOut = $request->get('check_out');
        if ($checkIn && $checkOut) {
            $availableCount = $this->checkRoomAvailability($room->id, $checkIn, $checkOut);
            $room->available_quantity = $availableCount;
            $room->is_available = $availableCount > 0;
        } else {
            $room->available_quantity = $room->quantity;
            $room->is_available = true;
        }
        
        return response()->json($room);
    }
    
    /**
     * Vérifier la disponibilité d'une chambre pour des dates données
     * Retourne le nombre de chambres disponibles (0 si aucune, ou nombre disponible)
     */
    private function checkRoomAvailability($roomId, $checkIn, $checkOut)
    {
        $room = Room::find($roomId);
        if (!$room) {
            return 0;
        }
        
        $quantity = $room->quantity ?? 1; // Par défaut 1 chambre
        
        // Compter les conflits de disponibilité manuelle
        $conflicts = DB::table('room_availabilities')
            ->where('room_id', $roomId)
            ->whereBetween('date', [$checkIn, $checkOut])
            ->where('status', '!=', 'available')
            ->count();
        
        // Si des dates sont marquées comme indisponibles, retourner 0
        if ($conflicts > 0) {
            return 0;
        }
        
        // Compter les réservations confirmées pour ces dates
        $bookingsCount = DB::table('bookings')
            ->where('room_id', $roomId)
            ->where('status', 'confirmed')
            ->where(function($q) use ($checkIn, $checkOut) {
                $q->whereBetween('check_in', [$checkIn, $checkOut])
                  ->orWhereBetween('check_out', [$checkIn, $checkOut])
                  ->orWhere(function($q2) use ($checkIn, $checkOut) {
                      $q2->where('check_in', '<=', $checkIn)
                         ->where('check_out', '>=', $checkOut);
                  });
            })
            ->count();
        
        // Calculer le nombre disponible
        $available = max(0, $quantity - $bookingsCount);
        
        return $available;
    }

    public function store(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut créer
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            // Champs de base (name retiré : on utilise uniquement le type)
            'name' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'description_en' => 'nullable|string',
            'capacity' => 'required|integer|min:1',
            'price_per_night' => 'required|numeric|min:0',
            'amenities' => 'nullable|array',
            'bedrooms' => 'required|integer|min:1',
            'bathrooms' => 'required|integer|min:1',
            'quantity' => 'nullable|integer|min:1|max:100', // Nombre total de chambres de ce type
            'bed_type' => 'nullable|string|max:255',
            
            // Système amélioré
            'room_category' => 'nullable|string|in:single,double,twin,triple,pmr,suite,other',
            'room_subcategory' => 'nullable|string',
            'bedding' => 'nullable|array',
            'bedding_custom' => 'nullable|string|max:255',
            'surface_area' => 'nullable|numeric|min:0',
            'bathroom_features' => 'nullable|array',
            'has_guest_toilet' => 'nullable|boolean',
            'has_additional_bathroom' => 'nullable|boolean',
            'basic_amenities' => 'nullable|array',
            'view_type' => 'nullable|string|in:city,garden,pool,sea,mountain,parking,lagoon,courtyard,none',
            'view_price_modifier' => 'nullable|integer|min:-100|max:100',
            'outdoor_features' => 'nullable|array',
            'outdoor_area' => 'nullable|numeric|min:0',
            'storage_options' => 'nullable|array',
            'has_living_room' => 'nullable|boolean',
            'living_room_features' => 'nullable|array',
            'has_kitchen' => 'nullable|boolean',
            'kitchen_type' => 'nullable|string|in:full,kitchenette,corner',
            'kitchen_equipment' => 'nullable|array',
            'has_dining_area' => 'nullable|boolean',
            'dining_capacity' => 'nullable|integer|min:0',
            'additional_bedrooms' => 'nullable|integer|min:0',
            'additional_bedrooms_config' => 'nullable|array',
            'premium_amenities' => 'nullable|array',
            'paid_options' => 'nullable|array',
            'has_private_pool' => 'nullable|boolean',
            'pool_heated' => 'nullable|boolean',
            'has_parking' => 'nullable|boolean',
            'parking_type' => 'nullable|string|in:garage,private,shared',
            'parking_price' => 'nullable|numeric|min:0',
            'is_pmr_accessible' => 'nullable|boolean',
            'pmr_features' => 'nullable|array',
            'single_occupancy_price' => 'nullable|numeric|min:0',
            'extra_bed_price' => 'nullable|numeric|min:0',
            'max_extra_beds' => 'nullable|integer|min:0',
            'custom_tags' => 'nullable|array',
        ]);

        // Tous les champs possibles (formulaire + modèle)
        $allKeys = [
            'name', 'name_en', 'type', 'description', 'description_en', 'capacity',
            'price_per_night', 'amenities', 'bedrooms', 'bathrooms', 'quantity',
            'room_category', 'room_subcategory', 'bedding', 'bedding_custom',
            'surface_area', 'bathroom_features', 'has_guest_toilet', 'has_additional_bathroom',
            'basic_amenities', 'view_type', 'view_price_modifier', 'outdoor_features',
            'outdoor_area', 'storage_options', 'has_living_room', 'living_room_features',
            'has_kitchen', 'kitchen_type', 'kitchen_equipment', 'has_dining_area',
            'dining_capacity', 'additional_bedrooms', 'additional_bedrooms_config',
            'premium_amenities', 'paid_options', 'has_private_pool', 'pool_heated',
            'has_parking', 'parking_type', 'parking_price', 'is_pmr_accessible',
            'pmr_features', 'single_occupancy_price', 'extra_bed_price', 'max_extra_beds',
            'custom_tags'
        ];
        $data = $request->only($allKeys);

        // Mapper le champ simple "bed_type" du formulaire vers la structure améliorée "bedding"
        if ($request->filled('bed_type') && empty($data['bedding'] ?? null)) {
            $data['bedding'] = [
                'type' => $request->input('bed_type'),
            ];
        }

        // Si pas de nom saisi, utiliser le type comme nom par défaut
        if (empty($data['name'])) {
            $data['name'] = $data['type'] ?? 'Chambre';
        }

        // Ne garder que les colonnes qui existent en base (évite Server Error si migration "enhance" non appliquée)
        $existingColumns = array_flip(Schema::getColumnListing('rooms'));
        $data = array_intersect_key($data, $existingColumns);

        // Valeurs par défaut pour éviter les erreurs NOT NULL
        $data['max_extra_beds'] = $data['max_extra_beds'] ?? 0;
        $data['single_occupancy_price'] = $data['single_occupancy_price'] ?? null;
        $data['extra_bed_price'] = $data['extra_bed_price'] ?? null;

        $data['accommodation_id'] = $accommodationId;
        $data['is_active'] = false; // Désactivé par défaut jusqu'à ce que 3 images soient ajoutées

        $room = Room::create($data);

        return response()->json($room->load(['availabilities', 'images']), 201);
    }

    public function update(Request $request, $accommodationId, $id)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($id);
        $accommodation = $room->accommodation;

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut modifier
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            // Champs de base
            'name' => 'sometimes|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'type' => 'sometimes|string|max:255',
            'quantity' => 'nullable|integer|min:1|max:100',
            'description' => 'nullable|string',
            'description_en' => 'nullable|string',
            'capacity' => 'sometimes|integer|min:1',
            'price_per_night' => 'sometimes|numeric|min:0',
            'amenities' => 'nullable|array',
            'bedrooms' => 'sometimes|integer|min:1',
            'bathrooms' => 'sometimes|integer|min:1',
            'is_active' => 'sometimes|boolean',
            'bed_type' => 'nullable|string|max:255',
            
            // Système amélioré
            'room_category' => 'nullable|string|in:single,double,twin,triple,pmr,suite,other',
            'room_subcategory' => 'nullable|string',
            'bedding' => 'nullable|array',
            'bedding_custom' => 'nullable|string|max:255',
            'surface_area' => 'nullable|numeric|min:0',
            'bathroom_features' => 'nullable|array',
            'has_guest_toilet' => 'nullable|boolean',
            'has_additional_bathroom' => 'nullable|boolean',
            'basic_amenities' => 'nullable|array',
            'view_type' => 'nullable|string|in:city,garden,pool,sea,mountain,parking,lagoon,courtyard,none',
            'view_price_modifier' => 'nullable|integer|min:-100|max:100',
            'outdoor_features' => 'nullable|array',
            'outdoor_area' => 'nullable|numeric|min:0',
            'storage_options' => 'nullable|array',
            'has_living_room' => 'nullable|boolean',
            'living_room_features' => 'nullable|array',
            'has_kitchen' => 'nullable|boolean',
            'kitchen_type' => 'nullable|string|in:full,kitchenette,corner',
            'kitchen_equipment' => 'nullable|array',
            'has_dining_area' => 'nullable|boolean',
            'dining_capacity' => 'nullable|integer|min:0',
            'additional_bedrooms' => 'nullable|integer|min:0',
            'additional_bedrooms_config' => 'nullable|array',
            'premium_amenities' => 'nullable|array',
            'paid_options' => 'nullable|array',
            'has_private_pool' => 'nullable|boolean',
            'pool_heated' => 'nullable|boolean',
            'has_parking' => 'nullable|boolean',
            'parking_type' => 'nullable|string|in:garage,private,shared',
            'parking_price' => 'nullable|numeric|min:0',
            'is_pmr_accessible' => 'nullable|boolean',
            'pmr_features' => 'nullable|array',
            'single_occupancy_price' => 'nullable|numeric|min:0',
            'extra_bed_price' => 'nullable|numeric|min:0',
            'max_extra_beds' => 'nullable|integer|min:0',
            'custom_tags' => 'nullable|array',
        ]);

        $updateData = $request->only([
            'name', 'name_en', 'type', 'description', 'description_en', 'capacity',
            'price_per_night', 'amenities', 'bedrooms', 'bathrooms', 'is_active',
            'room_category', 'room_subcategory', 'bedding', 'bedding_custom', 
            'surface_area', 'bathroom_features', 'has_guest_toilet', 'has_additional_bathroom',
            'basic_amenities', 'view_type', 'view_price_modifier', 'outdoor_features', 
            'outdoor_area', 'storage_options', 'has_living_room', 'living_room_features',
            'has_kitchen', 'kitchen_type', 'kitchen_equipment', 'has_dining_area', 
            'dining_capacity', 'additional_bedrooms', 'additional_bedrooms_config',
            'premium_amenities', 'paid_options', 'has_private_pool', 'pool_heated',
            'has_parking', 'parking_type', 'parking_price', 'is_pmr_accessible',
            'pmr_features', 'single_occupancy_price', 'extra_bed_price', 'max_extra_beds',
            'custom_tags'
        ]);

        // Mapper le champ simple "bed_type" du formulaire vers la structure améliorée "bedding"
        if ($request->filled('bed_type') && empty($updateData['bedding'])) {
            $updateData['bedding'] = [
                'type' => $request->input('bed_type'),
            ];
        }

        // Nom = type (plus de champ nom distinct)
        if (array_key_exists('type', $updateData)) {
            $updateData['name'] = $updateData['type'];
        }

        $room->update($updateData);

        return response()->json($room->load(['availabilities', 'images']));
    }

    public function destroy(Request $request, $accommodationId, $id)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($id);
        $accommodation = $room->accommodation;

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut supprimer
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Check if room has active bookings
        $hasBookings = $room->bookings()
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($hasBookings) {
            return response()->json([
                'message' => 'Cannot delete room with active bookings'
            ], 400);
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted successfully']);
    }

    /**
     * Upload une image pour une chambre
     */
    public function uploadImage(Request $request, $accommodationId, $roomId, ImageUploadService $uploadService)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);
        $accommodation = $room->accommodation;

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut uploader
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,jpg,png,webp|max:10240', // 10MB max
            'caption' => 'nullable|string|max:255',
            'caption_en' => 'nullable|string|max:255',
            'is_primary' => 'sometimes|boolean',
        ]);

        $file = $request->file('image');

        // Validation via le service
        $validation = $uploadService->validate($file, 10);
        if (!$validation['valid']) {
            return response()->json(['message' => $validation['error']], 422);
        }

        try {
            $result = $uploadService->upload($file, "rooms/{$roomId}", 'room');
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }

        // Si c'est l'image principale, désactiver les autres
        $isPrimary = filter_var($request->input('is_primary', false), FILTER_VALIDATE_BOOLEAN);
        if ($isPrimary) {
            $room->images()->update(['is_primary' => false]);
        }

        // Obtenir le prochain ordre de tri
        $sortOrder = $room->images()->max('sort_order') + 1;

        // Créer l'enregistrement
        $image = $room->images()->create([
            'image_path' => $result['full_url'],
            'is_primary' => $isPrimary,
            'sort_order' => $sortOrder,
            'caption' => $request->caption,
            'caption_en' => $request->caption_en,
        ]);

        // Activer la chambre si 3 images
        $imageCount = $room->images()->count();
        if ($imageCount >= 3 && !$room->is_active) {
            $room->update(['is_active' => true]);
        }

        return response()->json([
            'image' => $image,
            'room' => $room->load(['images', 'primaryImage']),
            'images_count' => $imageCount,
            'can_activate' => $imageCount >= 3,
        ], 201);
    }

    /**
     * Supprimer une image de chambre
     */
    public function deleteImage(Request $request, $accommodationId, $roomId, $imageId, ImageUploadService $uploadService)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);
        $accommodation = $room->accommodation;

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut supprimer
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $image = $room->images()->findOrFail($imageId);

        // Si c'est l'image principale, définir la prochaine comme principale
        if ($image->is_primary) {
            $nextImage = $room->images()
                ->where('id', '!=', $imageId)
                ->orderBy('sort_order')
                ->first();
            
            if ($nextImage) {
                $nextImage->update(['is_primary' => true]);
            }
        }

        // Supprimer via le service
        if ($image->image_path) {
            $uploadService->delete($image->image_path, true);
        }
        if ($image->thumbnail_path) {
            $uploadService->delete($image->thumbnail_path, true);
        }

        $image->delete();

        // Vérifier si la chambre a encore 3 images
        $remainingCount = $room->images()->count();
        if ($remainingCount < 3 && $room->is_active) {
            $room->update(['is_active' => false]);
            return response()->json([
                'message' => 'Image deleted successfully. Room deactivated (less than 3 images).',
                'room_deactivated' => true,
                'remaining_images' => $remainingCount
            ]);
        }

        return response()->json([
            'message' => 'Image deleted successfully',
            'remaining_images' => $remainingCount
        ]);
    }

    /**
     * Définir une image comme image principale
     */
    public function setPrimaryImage(Request $request, $accommodationId, $roomId, $imageId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);
        $accommodation = $room->accommodation;

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut définir l'image principale
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $image = $room->images()->findOrFail($imageId);

        // Désactiver toutes les autres images principales
        $room->images()->update(['is_primary' => false]);

        // Activer celle-ci
        $image->update(['is_primary' => true]);

        return response()->json($image);
    }

    /**
     * Activer/Désactiver une chambre (Admin uniquement)
     */
    public function toggleStatus(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);
        $user = $request->user();

        // Seul l'admin peut activer/désactiver
        if (!$user || !$user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $room->is_active = !$room->is_active;
        $room->save();

        return response()->json([
            'message' => $room->is_active ? 'Chambre activée' : 'Chambre désactivée',
            'room' => $room->load(['images', 'primaryImage'])
        ]);
    }

    /**
     * Réorganiser l'ordre des images
     */
    public function reorderImages(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);
        $accommodation = $room->accommodation;

        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

        // Seul l'admin ou le propriétaire peut réorganiser
        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'image_ids' => 'required|array',
            'image_ids.*' => 'required|integer|exists:room_images,id',
        ]);

        // Mettre à jour l'ordre
        DB::transaction(function () use ($room, $request) {
            foreach ($request->image_ids as $index => $imageId) {
                $room->images()->where('id', $imageId)->update(['sort_order' => $index]);
            }
        });

        return response()->json($room->load('images'));
    }
}
