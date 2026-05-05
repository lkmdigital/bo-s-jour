<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\AccommodationAuditLog;
use App\Models\AdminNote;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

/**
 * Controller pour la gestion des établissements par les admins
 */
class AdminAccommodationController extends Controller
{
    /**
     * Liste des établissements avec filtres
     */
    public function index(Request $request)
    {
        $query = Accommodation::with(['host', 'images', 'reviews']);

        // Filtres
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('host_id')) {
            $query->where('host_id', $request->host_id);
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $accommodations = $query->paginate($perPage);

        // Ajouter les statistiques pour chaque établissement
        $accommodationsData = $accommodations->items();
        foreach ($accommodationsData as $accommodation) {
            $accommodation->stats = $this->getAccommodationStats($accommodation->id);
            $this->attachComplianceData($accommodation);
        }

        return response()->json([
            'data' => $accommodationsData,
            'pagination' => [
                'current_page' => $accommodations->currentPage(),
                'last_page' => $accommodations->lastPage(),
                'per_page' => $accommodations->perPage(),
                'total' => $accommodations->total(),
            ],
        ]);
    }

    /**
     * Créer un établissement (par admin)
     */
    public function store(Request $request)
    {
        $this->authorize('create', Accommodation::class);

        $validated = $request->validate([
            'host_id' => 'required|exists:users,id',
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
            'status' => ['nullable', Rule::in(['pending', 'published', 'rejected', 'removed', 'disabled'])],
            'opening_year' => 'nullable|integer|min:1900|max:' . date('Y'),
            'star_rating' => 'nullable|integer|min:1|max:5',
            'room_types' => 'nullable|array',
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

        // Sécurité: empêcher la création de doublons pour le même hôte (même nom + ville)
        $duplicate = Accommodation::where('host_id', $validated['host_id'])
            ->whereRaw('LOWER(name) = LOWER(?)', [$validated['name']])
            ->whereRaw('LOWER(city) = LOWER(?)', [$validated['city']])
            ->whereNotIn('status', ['removed'])
            ->first();

        if ($duplicate) {
            return response()->json([
                'message' => 'Cet hôte a déjà un établissement avec ce nom dans cette ville. Modifiez l\'établissement existant ou choisissez un autre nom.',
                'existing_id' => $duplicate->id,
            ], 422);
        }

        // Générer un slug unique
        $baseSlug = \Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (Accommodation::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        $accommodation = Accommodation::create([
            'host_id' => $validated['host_id'],
            'name' => $validated['name'],
            'slug' => $slug,
            'type' => $validated['type'],
            'description' => $validated['description'],
            'description_en' => $validated['description_en'] ?? null,
            'address' => $validated['address'],
            'city' => $validated['city'],
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'price_per_night' => $validated['price_per_night'],
            'max_guests' => $validated['max_guests'],
            'bedrooms' => $validated['bedrooms'],
            'bathrooms' => $validated['bathrooms'],
            'amenities' => $validated['amenities'] ?? [],
            'status' => $validated['status'] ?? 'pending',
            'opening_year' => $validated['opening_year'] ?? null,
            'star_rating' => $validated['star_rating'] ?? null,
            'room_types' => $validated['room_types'] ?? [],
            'room_type_pricing' => $validated['room_type_pricing'] ?? [],
            'conference_rooms_count' => $validated['conference_rooms_count'] ?? 0,
            'conference_capacity' => $validated['conference_capacity'] ?? 0,
            'restaurant_capacity' => $validated['restaurant_capacity'] ?? 0,
            'bar_capacity' => $validated['bar_capacity'] ?? 0,
            'shuttle_service' => $request->boolean('shuttle_service', false),
            'laundry' => $request->boolean('laundry', false),
            'breakfast_price' => $validated['breakfast_price'] ?? null,
            'reception_24h' => $request->boolean('reception_24h', false),
            'smoking_area' => $request->boolean('smoking_area', false),
            'pets_allowed' => $request->boolean('pets_allowed', false),
            'other_amenities' => $validated['other_amenities'] ?? null,
            'deposit_required' => $request->boolean('deposit_required', true),
            'deposit_amount' => $validated['deposit_amount'] ?? 'first_night',
            'cancellation_policy_hours' => $validated['cancellation_policy_hours'] ?? 48,
            'payment_methods' => $validated['payment_methods'] ?? [],
            'special_conditions' => $validated['special_conditions'] ?? null,
            'breakfast_included' => $request->boolean('breakfast_included', false),
            'breakfast_included_persons' => $validated['breakfast_included_persons'] ?? 0,
            'check_in_time' => $validated['check_in_time'] ?? null,
            'check_out_time' => $validated['check_out_time'] ?? null,
            'invoice_paid_before_hours' => $validated['invoice_paid_before_hours'] ?? 48,
        ]);

        // Créer l'audit log
        AccommodationAuditLog::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'action' => 'created',
            'old_values' => null,
            'new_values' => $accommodation->toArray(),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Établissement créé avec succès',
            'data' => $accommodation->load('host'),
        ], 201);
    }

    /**
     * Détails d'un établissement
     */
    public function show($id)
    {
        $accommodation = Accommodation::with([
            'host',
            'images',
            'reviews.user',
            'auditLogs.user',
            'adminNotes.creator',
            'rooms',
        ])->findOrFail($id);

        $this->authorize('view', $accommodation);

        // Ajouter les statistiques détaillées
        $accommodation->stats = $this->getAccommodationStats($id, true);
        $this->attachComplianceData($accommodation);

        return response()->json(['data' => $accommodation]);
    }

    /**
     * Approuver un établissement
     */
    public function approve(Request $request, $id)
    {
        $accommodation = Accommodation::with('host')->findOrFail($id);
        $this->authorize('approve', $accommodation);

        $host = $accommodation->host;
        if (!$host || $host->compliance_status !== 'conforme') {
            $missing = $host
                ? collect($host->compliance_requirements)
                    ->filter(fn ($item) => empty($item['ok']))
                    ->pluck('label')
                    ->values()
                : collect(['Hôte introuvable']);

            return response()->json([
                'message' => 'Établissement non conforme: le profil hôte est incomplet.',
                'compliance_status' => 'non_conforme',
                'missing_requirements' => $missing,
            ], 422);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:5000',
        ]);

        $oldStatus = $accommodation->status;
        $accommodation->update(['status' => 'published']);

        // Créer l'audit log
        AccommodationAuditLog::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'action' => 'approved',
            'status_before' => $oldStatus,
            'status_after' => 'published',
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Établissement approuvé avec succès',
            'data' => $accommodation->load('auditLogs'),
        ]);
    }

    private function attachComplianceData(Accommodation $accommodation): void
    {
        $host = $accommodation->host;

        if (!$host) {
            $accommodation->compliance_status = 'non_conforme';
            return;
        }

        $host->compliance_status = $host->compliance_status;
        $accommodation->compliance_status = $host->compliance_status;
    }

    /**
     * Rejeter un établissement
     */
    public function reject(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);
        $this->authorize('reject', $accommodation);

        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
            'notes' => 'nullable|string|max:5000',
        ]);

        $oldStatus = $accommodation->status;
        $accommodation->update(['status' => 'rejected']);

        // Créer l'audit log
        AccommodationAuditLog::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'action' => 'rejected',
            'status_before' => $oldStatus,
            'status_after' => 'rejected',
            'reason' => $validated['reason'],
            'notes' => $validated['notes'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Établissement rejeté avec succès',
            'data' => $accommodation->load('auditLogs'),
        ]);
    }

    /**
     * Retirer un établissement
     */
    public function remove(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);
        $this->authorize('remove', $accommodation);

        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
            'notes' => 'nullable|string|max:5000',
        ]);

        $oldStatus = $accommodation->status;
        $accommodation->update(['status' => 'removed']);

        // Créer l'audit log
        AccommodationAuditLog::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'action' => 'removed',
            'status_before' => $oldStatus,
            'status_after' => 'removed',
            'reason' => $validated['reason'],
            'notes' => $validated['notes'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Établissement retiré avec succès',
            'data' => $accommodation->load('auditLogs'),
        ]);
    }

    /**
     * Désactiver un établissement
     */
    public function disable(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);
        $this->authorize('disable', $accommodation);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:5000',
        ]);

        $oldStatus = $accommodation->status;
        $accommodation->update(['status' => 'disabled']);

        // Créer l'audit log
        AccommodationAuditLog::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'action' => 'disabled',
            'status_before' => $oldStatus,
            'status_after' => 'disabled',
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Établissement désactivé avec succès',
            'data' => $accommodation->load('auditLogs'),
        ]);
    }

    /**
     * Réactiver un établissement
     */
    public function enable(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);
        $this->authorize('update', $accommodation);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:5000',
        ]);

        $oldStatus = $accommodation->status;
        
        // Réactiver en remettant le statut à 'published'
        $accommodation->update(['status' => 'published']);

        // Créer l'audit log
        AccommodationAuditLog::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'action' => 'enabled',
            'status_before' => $oldStatus,
            'status_after' => 'published',
            'reason' => $validated['reason'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Établissement réactivé avec succès',
            'data' => $accommodation->load('auditLogs'),
        ]);
    }

    /**
     * Ajouter une note interne
     */
    public function addNote(Request $request, $id)
    {
        $accommodation = Accommodation::findOrFail($id);
        $this->authorize('view', $accommodation);

        $validated = $request->validate([
            'note' => 'required|string|max:5000',
            'visibility' => ['required', 'in:admin,gerant,admin_gerant'],
            'is_important' => 'boolean',
        ]);

        $note = AdminNote::create([
            'noteable_type' => Accommodation::class,
            'noteable_id' => $accommodation->id,
            'created_by' => $request->user()->id,
            'note' => $validated['note'],
            'visibility' => $validated['visibility'],
            'is_important' => $validated['is_important'] ?? false,
        ]);

        return response()->json([
            'message' => 'Note ajoutée avec succès',
            'data' => $note->load('creator'),
        ], 201);
    }

    /**
     * Historique des modifications
     */
    public function auditLogs($id)
    {
        $accommodation = Accommodation::findOrFail($id);
        $this->authorize('view', $accommodation);

        $logs = AccommodationAuditLog::where('accommodation_id', $id)
            ->with('user')
            ->latest()
            ->paginate(50);

        return response()->json(['data' => $logs]);
    }

    /**
     * Calculer les statistiques d'un établissement
     */
    private function getAccommodationStats($accommodationId, $detailed = false)
    {
        $accommodation = Accommodation::find($accommodationId);
        if (!$accommodation) {
            return null;
        }

        // Nombre de chambres
        // Compter les chambres actives ; si is_active est null (anciennes données), on les considère actives
        $totalRooms = Room::where('accommodation_id', $accommodationId)
            ->where(function ($q) {
                $q->where('is_active', true)
                  ->orWhereNull('is_active');
            })
            ->count();

        // Fallback : si aucune chambre en table mais un nombre de chambres est renseigné sur l'établissement
        if ($totalRooms === 0 && $accommodation->bedrooms !== null) {
            $totalRooms = (int) $accommodation->bedrooms;
        }

        // Statistiques des réservations
        $now = now();
        $thirtyDaysAgo = $now->copy()->subDays(30);
        $thirtyDaysAhead = $now->copy()->addDays(30);
        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();

        // Réservations confirmées dans les 30 derniers jours
        $confirmedBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where('check_in', '>=', $thirtyDaysAgo)
            ->where('check_in', '<=', $thirtyDaysAhead)
            ->get();

        // Calculer le taux d'occupation
        $occupiedNights = 0;
        $totalAvailableNights = $totalRooms * 30; // 30 jours * nombre de chambres

        foreach ($confirmedBookings as $booking) {
            $checkIn = \Carbon\Carbon::parse($booking->check_in);
            $checkOut = \Carbon\Carbon::parse($booking->check_out);
            $nights = $checkIn->diffInDays($checkOut);
            
            // Ne compter que les nuits dans la période de 30 jours
            $periodStart = max($checkIn, $thirtyDaysAgo);
            $periodEnd = min($checkOut, $thirtyDaysAhead);
            if ($periodStart < $periodEnd) {
                $occupiedNights += $periodStart->diffInDays($periodEnd);
            }
        }

        $occupancyRate = $totalAvailableNights > 0 
            ? round(($occupiedNights / $totalAvailableNights) * 100, 2) 
            : 0;

        // Montant collecté (paiements complétés)
        $amountCollectedAllTime = Payment::where('status', 'completed')
            ->whereHas('booking', function ($q) use ($accommodationId) {
                $q->where('accommodation_id', $accommodationId);
            })
            ->sum('amount');

        $amountCollected30d = Payment::where('status', 'completed')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->whereHas('booking', function ($q) use ($accommodationId) {
                $q->where('accommodation_id', $accommodationId);
            })
            ->sum('amount');

        // Chambres occupées / réservées / libres (focus sur aujourd'hui)
        $overlappingToday = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where(function ($q) use ($todayStart, $todayEnd) {
                $q->whereBetween('check_in', [$todayStart, $todayEnd])
                  ->orWhereBetween('check_out', [$todayStart, $todayEnd])
                  ->orWhere(function ($sub) use ($todayStart, $todayEnd) {
                      $sub->where('check_in', '<=', $todayStart)
                          ->where('check_out', '>=', $todayEnd);
                  });
            });

        $occupiedRoomIds = (clone $overlappingToday)
            ->whereNotNull('room_id')
            ->pluck('room_id')
            ->unique();

        $occupiedUnknownRooms = (clone $overlappingToday)
            ->whereNull('room_id')
            ->count();

        $occupiedRoomsToday = $occupiedRoomIds->count() + min(
            $occupiedUnknownRooms,
            max($totalRooms - $occupiedRoomIds->count(), 0)
        );

        $reservedUpcomingQuery = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where('check_in', '>', $todayEnd);

        $reservedRoomIds = (clone $reservedUpcomingQuery)
            ->whereNotNull('room_id')
            ->pluck('room_id')
            ->unique();

        $reservedUnknownRooms = (clone $reservedUpcomingQuery)
            ->whereNull('room_id')
            ->count();

        $reservedRoomsUpcoming = $reservedRoomIds->count() + min(
            $reservedUnknownRooms,
            max($totalRooms - $reservedRoomIds->count(), 0)
        );

        $freeRoomsToday = max($totalRooms - $occupiedRoomsToday, 0);

        $stats = [
            'total_rooms' => $totalRooms,
            'occupancy_rate' => $occupancyRate,
            'occupied_nights' => $occupiedNights,
            'total_available_nights' => $totalAvailableNights,
            'confirmed_bookings_count' => $confirmedBookings->count(),
            'amount_collected_all_time' => $amountCollectedAllTime,
            'amount_collected_30d' => $amountCollected30d,
            'occupied_rooms_today' => $occupiedRoomsToday,
            'reserved_rooms_upcoming' => $reservedRoomsUpcoming,
            'free_rooms_today' => $freeRoomsToday,
        ];

        if ($detailed) {
            // Statistiques détaillées par chambre
            $rooms = Room::where('accommodation_id', $accommodationId)
                ->where(function ($q) {
                    $q->where('is_active', true)
                      ->orWhereNull('is_active');
                })
                ->withCount(['bookings' => function($query) use ($thirtyDaysAgo, $thirtyDaysAhead) {
                    $query->where('status', 'confirmed')
                        ->where('check_in', '>=', $thirtyDaysAgo)
                        ->where('check_in', '<=', $thirtyDaysAhead);
                }])
                ->get();

            $roomsStats = [];
            foreach ($rooms as $room) {
                $roomBookings = Booking::where('room_id', $room->id)
                    ->where('status', 'confirmed')
                    ->where('check_in', '>=', $thirtyDaysAgo)
                    ->where('check_in', '<=', $thirtyDaysAhead)
                    ->get();

                $roomOccupiedNights = 0;
                foreach ($roomBookings as $booking) {
                    $checkIn = \Carbon\Carbon::parse($booking->check_in);
                    $checkOut = \Carbon\Carbon::parse($booking->check_out);
                    $periodStart = max($checkIn, $thirtyDaysAgo);
                    $periodEnd = min($checkOut, $thirtyDaysAhead);
                    if ($periodStart < $periodEnd) {
                        $roomOccupiedNights += $periodStart->diffInDays($periodEnd);
                    }
                }

                $roomOccupancyRate = 30 > 0 
                    ? round(($roomOccupiedNights / 30) * 100, 2) 
                    : 0;

                $roomsStats[] = [
                    'id' => $room->id,
                    'name' => $room->name,
                    'type' => $room->type,
                    'capacity' => $room->capacity,
                    'price_per_night' => $room->price_per_night,
                    'bookings_count' => $room->bookings_count,
                    'occupied_nights' => $roomOccupiedNights,
                    'occupancy_rate' => $roomOccupancyRate,
                ];
            }

            $stats['rooms'] = $roomsStats;

            // Statistiques globales supplémentaires
            $allTimeBookings = Booking::where('accommodation_id', $accommodationId)
                ->where('status', 'confirmed')
                ->count();

            $pendingBookings = Booking::where('accommodation_id', $accommodationId)
                ->where('status', 'pending')
                ->count();

            $cancelledBookings = Booking::where('accommodation_id', $accommodationId)
                ->where('status', 'cancelled')
                ->count();

            $stats['all_time_bookings'] = $allTimeBookings;
            $stats['pending_bookings'] = $pendingBookings;
            $stats['cancelled_bookings'] = $cancelledBookings;
        }

        return $stats;
    }
}

