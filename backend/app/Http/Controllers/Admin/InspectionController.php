<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inspection;
use App\Models\InspectionChecklist;
use App\Models\InspectionResponse;
use App\Models\Accommodation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controller pour la gestion des inspections par les contrôleurs et admins
 */
class InspectionController extends Controller
{
    /**
     * Liste des inspections
     */
    public function index(Request $request)
    {
        $query = Inspection::with(['accommodation', 'inspector', 'responses.checklist']);

        // Filtres
        if ($request->has('accommodation_id')) {
            $query->where('accommodation_id', $request->accommodation_id);
        }

        if ($request->has('inspector_id')) {
            $query->where('inspector_id', $request->inspector_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('result')) {
            $query->where('result', $request->result);
        }

        // Les contrôleurs ne voient que leurs inspections
        if ($request->user()->hasRole('controleur') && !$request->user()->hasAnyRole(['super_admin', 'admin', 'gerant'])) {
            $query->where('inspector_id', $request->user()->id);
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $inspections = $query->paginate($perPage);

        return response()->json([
            'data' => $inspections->items(),
            'pagination' => [
                'current_page' => $inspections->currentPage(),
                'last_page' => $inspections->lastPage(),
                'per_page' => $inspections->perPage(),
                'total' => $inspections->total(),
            ],
        ]);
    }

    /**
     * Détails d'une inspection
     */
    public function show($id)
    {
        $inspection = Inspection::with([
            'accommodation.host',
            'inspector',
            'responses.checklist',
        ])->findOrFail($id);

        $this->authorize('view', $inspection);

        return response()->json(['data' => $inspection]);
    }

    /**
     * Créer une inspection
     */
    public function store(Request $request)
    {
        $this->authorize('create', Inspection::class);

        $validated = $request->validate([
            'accommodation_id' => 'required|exists:accommodations,id',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        // Si pas de scheduled_at, on planifie pour maintenant
        $scheduledAt = $validated['scheduled_at'] ?? now();

        $inspection = Inspection::create([
            'accommodation_id' => $validated['accommodation_id'],
            'inspector_id' => $request->user()->id,
            'status' => 'scheduled',
            'scheduled_at' => $scheduledAt,
        ]);

        return response()->json([
            'message' => 'Inspection créée avec succès',
            'data' => $inspection->load('accommodation', 'inspector'),
        ], 201);
    }

    /**
     * Démarrer une inspection
     */
    public function start(Request $request, $id)
    {
        $inspection = Inspection::findOrFail($id);
        $this->authorize('update', $inspection);

        // Vérifier que le contrôleur connecté est bien celui assigné à l'inspection
        // Les admins peuvent démarrer n'importe quelle inspection, mais les contrôleurs seulement les leurs
        if ($request->user()->hasRole('controleur') && !$request->user()->hasAnyRole(['super_admin', 'admin', 'gerant'])) {
            if ($inspection->inspector_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à démarrer cette inspection. Seul le contrôleur assigné peut démarrer l\'inspection.',
                ], 403);
            }
        }

        if ($inspection->status !== 'scheduled') {
            return response()->json([
                'message' => 'Cette inspection ne peut pas être démarrée',
            ], 400);
        }

        $inspection->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        return response()->json([
            'message' => 'Inspection démarrée',
            'data' => $inspection,
        ]);
    }

    /**
     * Ajouter une réponse à un critère
     */
    public function addResponse(Request $request, $id)
    {
        $inspection = Inspection::findOrFail($id);
        $this->authorize('update', $inspection);

        // Vérifier que le contrôleur connecté est bien celui assigné à l'inspection
        // Les admins peuvent ajouter des réponses, mais les contrôleurs seulement aux leurs
        if ($request->user()->hasRole('controleur') && !$request->user()->hasAnyRole(['super_admin', 'admin', 'gerant'])) {
            if ($inspection->inspector_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à modifier cette inspection. Seul le contrôleur assigné peut ajouter des réponses.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'checklist_id' => 'nullable|exists:inspection_checklists,id',
            'criteria_key' => 'nullable|string', // Clé alternative (nom du critère)
            'value_boolean' => 'nullable|boolean',
            'value_rating' => 'nullable|integer|min:1|max:5',
            'value_text' => 'nullable|string|max:5000',
            'comment' => 'nullable|string|max:2000',
            'media_files' => 'nullable|array',
        ]);

        // Trouver le checklist par ID ou par nom (criteria_key)
        $checklistId = $validated['checklist_id'] ?? null;
        if (!$checklistId && !empty($validated['criteria_key'])) {
            $checklist = InspectionChecklist::where('name', $validated['criteria_key'])->first();
            if (!$checklist) {
                return response()->json(['message' => 'Critère non trouvé'], 404);
            }
            $checklistId = $checklist->id;
        }
        
        if (!$checklistId) {
            return response()->json(['message' => 'checklist_id ou criteria_key requis'], 400);
        }

        $response = InspectionResponse::updateOrCreate(
            [
                'inspection_id' => $inspection->id,
                'checklist_id' => $checklistId,
            ],
            [
                'value_boolean' => $validated['value_boolean'] ?? null,
                'value_rating' => $validated['value_rating'] ?? null,
                'value_text' => $validated['value_text'] ?? null,
                'comment' => $validated['comment'] ?? null,
                'media_files' => $validated['media_files'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Réponse enregistrée',
            'data' => $response->load('checklist'),
        ]);
    }

    /**
     * Compléter une inspection
     */
    public function complete(Request $request, $id)
    {
        $inspection = Inspection::findOrFail($id);
        $this->authorize('complete', $inspection);

        if ($inspection->status !== 'in_progress') {
            return response()->json([
                'message' => 'Cette inspection ne peut pas être complétée',
            ], 400);
        }

        // Sans au moins une réponse, calculateScore() renvoie 0 et le résultat
        // basculerait automatiquement en "rejected" — trompeur pour une inspection
        // qu'on vient à peine de démarrer.
        if ($inspection->responses()->count() === 0) {
            return response()->json([
                'message' => 'Renseignez au moins un critère avant de compléter l\'inspection.',
            ], 400);
        }

        $validated = $request->validate([
            'observations' => 'nullable|string|max:10000',
            'recommendations' => 'nullable|string|max:10000',
            'signature_base64' => 'nullable|string',
            'location_data' => 'nullable|array',
        ]);

        // Calculer le score
        $score = $inspection->calculateScore();

        // Déterminer le résultat
        $result = 'pending_review';
        if ($score >= 80) {
            $result = 'approved';
        } elseif ($score < 50) {
            $result = 'rejected';
        }

        $inspection->update([
            'status' => 'completed',
            'completed_at' => now(),
            'score' => $score,
            'result' => $result,
            'observations' => $validated['observations'] ?? null,
            'recommendations' => $validated['recommendations'] ?? null,
            'signature_base64' => $validated['signature_base64'] ?? null,
            'location_data' => $validated['location_data'] ?? null,
        ]);

        return response()->json([
            'message' => 'Inspection complétée',
            'data' => $inspection->load('responses.checklist'),
        ]);
    }

    /**
     * Approuver une inspection
     */
    public function approve(Request $request, $id)
    {
        $inspection = Inspection::findOrFail($id);
        $this->authorize('approve', $inspection);

        // Sans cette garde, une inspection jamais démarrée/complétée pouvait être
        // approuvée directement, publiant l'établissement sans qu'il ait été
        // réellement inspecté.
        if ($inspection->status !== 'completed') {
            return response()->json([
                'message' => 'Seule une inspection complétée peut être approuvée.',
            ], 400);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:2000',
        ]);

        $inspection->update([
            'result' => 'approved',
        ]);

        // Si approuvé, approuver automatiquement l'établissement
        if ($inspection->accommodation->status === 'pending') {
            $inspection->accommodation->update(['status' => 'published']);
        }

        return response()->json([
            'message' => 'Inspection approuvée',
            'data' => $inspection,
        ]);
    }

    /**
     * Rejeter une inspection
     */
    public function reject(Request $request, $id)
    {
        $inspection = Inspection::findOrFail($id);
        $this->authorize('reject', $inspection);

        if ($inspection->status !== 'completed') {
            return response()->json([
                'message' => 'Seule une inspection complétée peut être rejetée.',
            ], 400);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $inspection->update([
            'result' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json([
            'message' => 'Inspection rejetée',
            'data' => $inspection,
        ]);
    }

    /**
     * Liste des critères de checklist
     */
    public function checklists(Request $request)
    {
        $query = InspectionChecklist::active();

        if ($request->has('category')) {
            $query->forCategory($request->category);
        }

        $checklists = $query->orderBy('order')->get();

        return response()->json(['data' => $checklists]);
    }

    /**
     * Liste des établissements pour les contrôleurs (pour créer des inspections)
     */
    public function accommodations(Request $request)
    {
        // Autoriser les contrôleurs et admins
        $user = $request->user();
        if (!$user || (!$user->hasRole('controleur') && !$user->hasAnyRole(['admin', 'super_admin']))) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $query = Accommodation::with('host')
            ->whereIn('status', ['published', 'pending', 'unavailable', 'renovation']);

        // Recherche
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 100);
        $accommodations = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => $accommodations->items(),
            'pagination' => [
                'total' => $accommodations->total(),
                'per_page' => $accommodations->perPage(),
                'current_page' => $accommodations->currentPage(),
                'last_page' => $accommodations->lastPage(),
            ],
        ]);
    }

    /**
     * Générer les critères d'inspection basés sur l'établissement
     */
    public function generateChecklist($id)
    {
        $inspection = Inspection::with('accommodation')->findOrFail($id);
        $this->authorize('view', $inspection);

        $accommodation = $inspection->accommodation;
        if (!$accommodation) {
            return response()->json(['message' => 'Établissement non trouvé'], 404);
        }

        // Récupérer ou créer les critères
        $userId = auth()->id();
        $order = 0;
        $allItems = InspectionChecklist::where('active', true)
            ->orderBy('category')
            ->orderBy('order')
            ->get()
            ->keyBy('name');
        
        // Liste des critères à créer basés sur l'établissement
        $criteriaToCreate = [];
        
        // Groupe 1: Informations générales (toujours présents)
        $criteriaToCreate[] = ['name' => 'Nom de l\'établissement', 'category' => 'general', 'type' => 'rating'];
        $criteriaToCreate[] = ['name' => 'Type d\'établissement', 'category' => 'general', 'type' => 'rating'];
        $criteriaToCreate[] = ['name' => 'Description', 'category' => 'general', 'type' => 'rating'];
        if ($accommodation->opening_year) {
            $criteriaToCreate[] = ['name' => 'Année d\'ouverture', 'category' => 'general', 'type' => 'rating'];
        }
        if ($accommodation->star_rating) {
            $criteriaToCreate[] = ['name' => 'Classement (étoiles)', 'category' => 'general', 'type' => 'rating'];
        }
        
        // Groupe 2: Localisation (toujours présents)
        $criteriaToCreate[] = ['name' => 'Adresse', 'category' => 'location', 'type' => 'rating'];
        $criteriaToCreate[] = ['name' => 'Ville', 'category' => 'location', 'type' => 'rating'];
        $criteriaToCreate[] = ['name' => 'Coordonnées GPS', 'category' => 'location', 'type' => 'rating'];
        
        // Groupe 3: Capacité (toujours présents)
        $criteriaToCreate[] = ['name' => 'Capacité maximale', 'category' => 'capacity', 'type' => 'rating'];
        $criteriaToCreate[] = ['name' => 'Nombre de chambres', 'category' => 'capacity', 'type' => 'rating'];
        $criteriaToCreate[] = ['name' => 'Nombre de salles de bain', 'category' => 'capacity', 'type' => 'rating'];
        if ($accommodation->room_types) {
            $criteriaToCreate[] = ['name' => 'Types de chambres', 'category' => 'capacity', 'type' => 'rating'];
        }
        
        // Groupe 4: Services
        if ($accommodation->amenities) {
            $criteriaToCreate[] = ['name' => 'Équipements déclarés', 'category' => 'services', 'type' => 'rating'];
        }
        $criteriaToCreate[] = ['name' => 'Réception 24h/24', 'category' => 'services', 'type' => 'boolean'];
        $criteriaToCreate[] = ['name' => 'Service de navette', 'category' => 'services', 'type' => 'boolean'];
        $criteriaToCreate[] = ['name' => 'Buanderie', 'category' => 'services', 'type' => 'boolean'];
        $criteriaToCreate[] = ['name' => 'Espace fumeur', 'category' => 'services', 'type' => 'boolean'];
        $criteriaToCreate[] = ['name' => 'Animaux acceptés', 'category' => 'services', 'type' => 'boolean'];
        
        // Groupe 5: Services supplémentaires (seulement si déclarés)
        if ($accommodation->conference_rooms_count > 0) {
            $criteriaToCreate[] = ['name' => 'Salles de conférence', 'category' => 'additional', 'type' => 'rating'];
        }
        if ($accommodation->restaurant_capacity > 0) {
            $criteriaToCreate[] = ['name' => 'Capacité restaurant', 'category' => 'additional', 'type' => 'rating'];
        }
        if ($accommodation->bar_capacity > 0) {
            $criteriaToCreate[] = ['name' => 'Capacité bar', 'category' => 'additional', 'type' => 'rating'];
        }
        
        // Groupe 6: Tarifs (toujours présents)
        $criteriaToCreate[] = ['name' => 'Prix par nuit', 'category' => 'pricing', 'type' => 'rating'];
        if ($accommodation->breakfast_price) {
            $criteriaToCreate[] = ['name' => 'Prix du petit déjeuner', 'category' => 'pricing', 'type' => 'rating'];
        }
        $criteriaToCreate[] = ['name' => 'Petit déjeuner inclus', 'category' => 'pricing', 'type' => 'boolean'];
        if ($accommodation->check_in_time) {
            $criteriaToCreate[] = ['name' => 'Heure d\'arrivée (Check-in)', 'category' => 'pricing', 'type' => 'rating'];
        }
        if ($accommodation->check_out_time) {
            $criteriaToCreate[] = ['name' => 'Heure de départ (Check-out)', 'category' => 'pricing', 'type' => 'rating'];
        }
        
        // Créer les critères s'ils n'existent pas
        foreach ($criteriaToCreate as $criteriaData) {
            if (!$allItems->has($criteriaData['name'])) {
                $item = InspectionChecklist::create([
                    'name' => $criteriaData['name'],
                    'description' => $this->getDescriptionForName($criteriaData['name']),
                    'category' => $criteriaData['category'],
                    'type' => $criteriaData['type'],
                    'order' => $order++,
                    'active' => true,
                    'created_by' => $userId,
                ]);
                $allItems->put($criteriaData['name'], $item);
            }
        }
        
        // Filtrer les critères créés pour ne garder que ceux qui sont pertinents pour cet établissement
        $criteriaNames = array_column($criteriaToCreate, 'name');
        $checklistItems = $allItems->filter(function ($item) use ($criteriaNames) {
            return in_array($item->name, $criteriaNames);
        })->values();

        // Organiser par groupe et filtrer selon les données de l'établissement
        $organizedCriteria = [];
        foreach ($checklistItems as $item) {
            $category = $item->category ?? 'general';
            $value = $this->getAccommodationValue($accommodation, $item->name);
            
            // Ne pas inclure les critères sans valeur déclarée (sauf pour les critères obligatoires)
            // Pour l'instant, on inclut tous les critères créés
            if (!isset($organizedCriteria[$category])) {
                $organizedCriteria[$category] = [];
            }
            $organizedCriteria[$category][] = [
                'id' => $item->id,
                'key' => $item->name, // Utiliser name comme clé
                'label' => $item->name,
                'type' => $item->type,
                'value' => $value,
                'description' => $item->description,
            ];
        }

        return response()->json(['data' => $organizedCriteria]);
    }


    /**
     * Obtenir la description pour un nom de critère
     */
    private function getDescriptionForName($name)
    {
        $descriptions = [
            'Nom de l\'établissement' => 'Vérifier que le nom correspond à la réalité',
            'Type d\'établissement' => 'Vérifier que le type correspond (hôtel, lodge, etc.)',
            'Description' => 'Vérifier l\'exactitude de la description',
            'Année d\'ouverture' => 'Vérifier l\'année d\'ouverture',
            'Classement (étoiles)' => 'Vérifier le classement étoiles',
            'Adresse' => 'Vérifier l\'adresse exacte',
            'Ville' => 'Vérifier la ville',
            'Coordonnées GPS' => 'Vérifier les coordonnées GPS',
            'Capacité maximale' => 'Vérifier la capacité maximale',
            'Nombre de chambres' => 'Vérifier le nombre de chambres',
            'Nombre de salles de bain' => 'Vérifier le nombre de salles de bain',
            'Types de chambres' => 'Vérifier les types de chambres déclarés',
            'Équipements déclarés' => 'Vérifier la présence des équipements déclarés',
            'Réception 24h/24' => 'Vérifier si la réception est ouverte 24h/24',
            'Service de navette' => 'Vérifier la disponibilité du service de navette',
            'Buanderie' => 'Vérifier la présence d\'une buanderie',
            'Espace fumeur' => 'Vérifier la présence d\'un espace fumeur',
            'Animaux acceptés' => 'Vérifier si les animaux sont acceptés',
            'Salles de conférence' => 'Vérifier le nombre de salles de conférence',
            'Capacité restaurant' => 'Vérifier la capacité du restaurant',
            'Capacité bar' => 'Vérifier la capacité du bar',
            'Prix par nuit' => 'Vérifier le prix par nuit',
            'Prix du petit déjeuner' => 'Vérifier le prix du petit déjeuner',
            'Petit déjeuner inclus' => 'Vérifier si le petit déjeuner est inclus',
            'Heure d\'arrivée (Check-in)' => 'Vérifier l\'heure de check-in',
            'Heure de départ (Check-out)' => 'Vérifier l\'heure de check-out',
        ];
        return $descriptions[$name] ?? '';
    }

    /**
     * Récupérer la valeur de l'établissement pour un critère
     */
    private function getAccommodationValue($accommodation, $key)
    {
        $mapping = [
            'Nom de l\'établissement' => $accommodation->name,
            'Type d\'établissement' => $accommodation->type,
            'Description' => $accommodation->description,
            'Année d\'ouverture' => $accommodation->opening_year,
            'Classement (étoiles)' => $accommodation->star_rating,
            'Adresse' => $accommodation->address,
            'Ville' => $accommodation->city,
            'Coordonnées GPS' => $accommodation->latitude && $accommodation->longitude 
                ? $accommodation->latitude . ', ' . $accommodation->longitude
                : null,
            'Capacité maximale' => $accommodation->max_guests,
            'Nombre de chambres' => $accommodation->bedrooms,
            'Nombre de salles de bain' => $accommodation->bathrooms,
            'Types de chambres' => $accommodation->room_types ? json_encode($accommodation->room_types) : null,
            'Équipements déclarés' => $accommodation->amenities ? json_encode($accommodation->amenities) : null,
            'Réception 24h/24' => $accommodation->reception_24h,
            'Service de navette' => $accommodation->shuttle_service,
            'Buanderie' => $accommodation->laundry,
            'Espace fumeur' => $accommodation->smoking_area,
            'Animaux acceptés' => $accommodation->pets_allowed,
            'Salles de conférence' => $accommodation->conference_rooms_count,
            'Capacité restaurant' => $accommodation->restaurant_capacity,
            'Capacité bar' => $accommodation->bar_capacity,
            'Prix par nuit' => $accommodation->price_per_night,
            'Prix du petit déjeuner' => $accommodation->breakfast_price,
            'Petit déjeuner inclus' => $accommodation->breakfast_included,
            'Heure d\'arrivée (Check-in)' => $accommodation->check_in_time,
            'Heure de départ (Check-out)' => $accommodation->check_out_time,
        ];

        return $mapping[$key] ?? null;
    }

    /**
     * Arrêter/pause une inspection
     */
    public function pause(Request $request, $id)
    {
        $inspection = Inspection::findOrFail($id);
        $this->authorize('update', $inspection);

        // Vérifier que le contrôleur connecté est bien celui assigné à l'inspection
        // Les admins peuvent mettre en pause, mais les contrôleurs seulement les leurs
        if ($request->user()->hasRole('controleur') && !$request->user()->hasAnyRole(['super_admin', 'admin', 'gerant'])) {
            if ($inspection->inspector_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Vous n\'êtes pas autorisé à mettre en pause cette inspection. Seul le contrôleur assigné peut mettre en pause l\'inspection.',
                ], 403);
            }
        }

        if ($inspection->status !== 'in_progress') {
            return response()->json([
                'message' => 'Cette inspection n\'est pas en cours',
            ], 400);
        }

        // Bascule pause / reprise (même endpoint, pas de route dédiée pour "reprendre").
        if ($inspection->paused_at) {
            $inspection->update(['paused_at' => null]);
            return response()->json([
                'message' => 'Inspection reprise',
                'data' => $inspection,
            ]);
        }

        $inspection->update(['paused_at' => now()]);

        return response()->json([
            'message' => 'Inspection mise en pause',
            'data' => $inspection,
        ]);
    }
}

