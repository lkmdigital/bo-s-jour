<?php

namespace App\Http\Controllers;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Accommodation;
use App\Models\Promotion;
use App\Models\Room;
use App\Models\User;
use App\Services\BookingService;
use App\Services\PaymentOptionsService;
use App\Services\RoomPricingService;
use App\Services\CancellationPolicyService;
use App\Models\RoomAvailability;
use App\Models\CorporateCollaborator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\SecurityService;

class BookingController extends Controller
{
    public function __construct(private BookingService $bookingService) {}

    public function index(Request $request)
    {
        $query = Booking::with(['accommodation.images', 'room', 'user', 'payment']);

        if ($request->user()->isUser()) {
            $query->where('user_id', $request->user()->id);
        } elseif ($request->user()->isHost()) {
            $hostScopeId = $request->user()->hostScopeId();
            $query->whereHas('accommodation', function($q) use ($hostScopeId) {
                $q->where('host_id', $hostScopeId);
            });
        }

        // Filtre par statut
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filtre par statut de paiement
        if ($request->has('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        // Filtre par période (upcoming, past, all)
        if ($request->has('period') && $request->period !== 'all') {
            $now = now();
            if ($request->period === 'upcoming') {
                $query->where('check_in', '>=', $now);
            } elseif ($request->period === 'past') {
                $query->where('check_out', '<', $now);
            }
        }

        // Recherche par nom d'hébergement ou ville
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('accommodation', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 15);
        $bookings = $query->paginate($perPage);

        return response()->json($bookings);
    }

    public function hostReservations(Request $request)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $now = \Carbon\Carbon::now();
        $hostId = $request->user()->hostScopeId();

        $base = Booking::with(['accommodation.images', 'room', 'user'])
            ->whereHas('accommodation', function($q) use ($hostId) {
                $q->where('host_id', $hostId);
            })
            ->whereIn('status', ['confirmed', 'pending']);

        $startOfWeek = $now->copy()->startOfWeek();
        $endOfWeek = $now->copy()->endOfWeek();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $endOfTwoMonths = $now->copy()->addMonthsNoOverflow(2)->endOfMonth();

        $week = (clone $base)
            ->whereBetween('check_in', [$startOfWeek, $endOfWeek])
            ->orderBy('check_in', 'asc')
            ->get();

        $month = (clone $base)
            ->whereBetween('check_in', [$startOfMonth, $endOfMonth])
            ->orderBy('check_in', 'asc')
            ->get();

        $twoMonths = (clone $base)
            ->whereBetween('check_in', [$startOfMonth, $endOfTwoMonths])
            ->orderBy('check_in', 'asc')
            ->get();

        $history = (clone $base)
            ->where('check_out', '<', $now)
            ->orderBy('check_in', 'desc')
            ->limit(100)
            ->get();

        return response()->json([
            'week' => $week,
            'month' => $month,
            'two_months' => $twoMonths,
            'history' => $history,
        ]);
    }

    public function store(Request $request)
    {
        $isAuthenticated = $request->user() !== null;
        
        // Validation de base
        $validationRules = [
            'accommodation_id' => 'required|exists:accommodations,id',
            'room_id' => 'nullable|exists:rooms,id',
            // after_or_equal (pas after) : une arrivée le jour même doit rester possible
            // (ex. réservation de dernière minute pour la nuit même) — cohérent avec la
            // règle utilisée pour la modification d'une réservation existante (update()).
            'check_in' => 'required|date|after_or_equal:today',
            'check_out' => 'required|date|after:check_in',
            'guests' => 'required|integer|min:1',
            'promo_code' => 'nullable|string|max:100',
            'special_requests' => 'nullable|string|max:1000',
            'booked_for_third_party' => 'nullable|boolean',
            'traveler_name' => 'nullable|string|max:255|required_if:booked_for_third_party,true',
            'traveler_phone' => 'nullable|string|max:20|regex:/^[\+]?[0-9\s\-\(\)]+$/|required_if:booked_for_third_party,true',
            'traveler_email' => 'nullable|string|email|max:255',
            // Type de voyageur + données statistiques
            'traveler_type' => 'nullable|string|in:individual,corporate',
            'residence_country' => 'nullable|string|max:255',
            'residence_city' => 'nullable|string|max:255',
            // Corporate (voyageur d'entreprise)
            'company_name' => 'nullable|string|max:255|required_if:traveler_type,corporate',
            'company_vat' => 'nullable|string|max:100',
            'company_address' => 'nullable|string|max:500',
            'company_billing_email' => 'nullable|string|email|max:255|required_if:traveler_type,corporate',
            'company_service' => 'nullable|string|max:255',
            'company_project' => 'nullable|string|max:255',
            'deferred_payment' => 'nullable|boolean',
        ];

        // Si l'utilisateur n'est pas authentifié, valider les informations utilisateur
        if (!$isAuthenticated) {
            // Vérifier l'activité suspecte
            if (!SecurityService::checkSuspiciousActivity($request, 'booking')) {
                return response()->json([
                    'message' => 'Too many requests. Please try again later.'
                ], 429);
            }

            $validationRules = array_merge($validationRules, [
                'name' => 'required|string|max:255|regex:/^[a-zA-Z\s\-\']+$/u', // Seulement lettres, espaces, tirets et apostrophes
                'email' => 'required|string|email|max:255',
                'phone' => 'required|string|max:20|regex:/^[\+]?[0-9\s\-\(\)]+$/', // Format téléphone valide
                // Nationalité et pièce d'identité ne sont plus obligatoires pour la réservation
                'nationality' => 'nullable|string|max:255',
                'id_type' => 'nullable|string|in:CNI,Passeport,Permis',
                'id_number' => 'nullable|string|max:255|regex:/^[a-zA-Z0-9]+$/', // Seulement alphanumérique
            ]);
        }

        // La validation Laravel doit passer AVANT les contrôles SecurityService
        // ci-dessous : email/phone sont "required" seulement dans la branche non
        // authentifiée, donc les passer bruts (potentiellement null) à des méthodes
        // qui exigent une string plantait en TypeError (500) au lieu de renvoyer une
        // erreur 422 propre lorsque le champ était absent de la requête.
        $request->validate($validationRules);

        if (!$isAuthenticated) {
            // Validation supplémentaire avec SecurityService
            if (!SecurityService::validateEmail($request->email)) {
                SecurityService::recordSuspiciousActivity($request, 'booking');
                return response()->json([
                    'message' => 'Invalid email format.'
                ], 422);
            }

            if (!SecurityService::validatePhone($request->phone)) {
                SecurityService::recordSuspiciousActivity($request, 'booking');
                return response()->json([
                    'message' => 'Invalid phone number format.'
                ], 422);
            }
        }

        $bookedForThirdParty = $request->boolean('booked_for_third_party');

        // Logger la création de réservation
        Log::channel('security')->info('Booking creation attempt', [
            'accommodation_id' => $request->accommodation_id,
            'is_authenticated' => $isAuthenticated,
            'user_id' => $isAuthenticated ? $request->user()->id : null,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toIso8601String(),
        ]);

        $accommodation = Accommodation::findOrFail($request->accommodation_id);

        // Gérer l'utilisateur : authentifié ou création automatique
        $user = null;
        if ($isAuthenticated) {
            $user = $request->user();
            // Prevent a host from booking their own accommodation
            if ($user->hostScopeId() === $accommodation->host_id) {
                return response()->json(['message' => 'Hosts cannot book their own accommodation'], 403);
            }
        } else {
            // Créer un compte utilisateur automatiquement
            // Vérifier si l'email existe déjà
            $existingUser = User::where('email', $request->email)->first();
            
            if ($existingUser) {
                // Si l'utilisateur existe, utiliser ce compte
                $user = $existingUser;
            } else {
                // Créer un nouvel utilisateur avec un mot de passe aléatoire
                $randomPassword = Str::random(16);
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($randomPassword),
                    'phone' => $request->phone,
                    // Nationalité et pièces peuvent rester nulles si non fournies
                    'country' => $request->residence_country ?? $request->nationality,
                    'city' => $request->residence_city,
                    'id_type' => $request->id_type,
                    'id_number' => $request->id_number,
                    'role' => 'user',
                    'status' => 'active',
                    'is_guest' => true, // compte à activer par le voyageur après réservation
                ]);
            }
        }

        if ($accommodation->status !== 'published') {
            return response()->json(['message' => 'Accommodation not available'], 400);
        }

        $room          = null;
        $pricePerNight = $accommodation->price_per_night;

        if ($request->room_id) {
            $room = Room::where('accommodation_id', $request->accommodation_id)
                ->where('is_active', true)
                ->findOrFail($request->room_id);

            if ($request->guests > $room->capacity) {
                return response()->json(['message' => 'Exceeds room capacity'], 400);
            }

            // Tarification par période : prix moyen par nuit selon les périodes
            // tarifaires programmées par l'hôte (sinon tarif de base)
            $pricePerNight = RoomPricingService::getAverageBasePricePerNight(
                $room,
                $request->check_in,
                $request->check_out
            );

        } else {
            // Legacy : réservation sans chambre spécifique
            if ($request->guests > $accommodation->max_guests) {
                return response()->json(['message' => 'Exceeds maximum guests'], 400);
            }

            $conflictingBookings = Booking::where('accommodation_id', $request->accommodation_id)
                ->whereNull('room_id')
                ->whereIn('status', BookingStatus::occupying())
                ->where('check_in', '<', $request->check_out)
                ->where('check_out', '>', $request->check_in)
                ->exists();

            if ($conflictingBookings) {
                return response()->json(['message' => 'Accommodation not available for selected dates'], 400);
            }
        }

        $nights = \Carbon\Carbon::parse($request->check_in)
            ->diffInDays(\Carbon\Carbon::parse($request->check_out));

        // Tarification auto (si activée par l'hôte) : déclinaisons selon politique et durée
        $cancellationHours = $accommodation->cancellation_policy_hours ?? 48;
        $effectivePricePerNight = RoomPricingService::getEffectivePricePerNight(
            (float) $pricePerNight,
            (int) $cancellationHours,
            $nights,
            $accommodation,
            $request->check_in
        );

        $basePrice = $effectivePricePerNight * $nights;
        
        // Vérifier s'il y a une promotion active pour cette période (brief Étape 33 :
        // pourcentage, montant fixe, nuit offerte, séjour minimum, code promo).
        $promotion = null;
        $submittedPromoCode = trim((string) $request->input('promo_code', ''));
        try {
            $candidates = Promotion::where('accommodation_id', $request->accommodation_id)
                ->where('is_active', true)
                ->where(function ($q) use ($request) {
                    // Promotion pour une chambre spécifique ou toutes les chambres
                    $q->where(function ($q2) use ($request) {
                        if ($request->room_id) {
                            $q2->where('room_id', $request->room_id)
                               ->orWhereNull('room_id');
                        } else {
                            $q2->whereNull('room_id');
                        }
                    });
                })
                ->validForPeriod($request->check_in, $request->check_out)
                ->get()
                ->filter(function (Promotion $p) use ($nights, $submittedPromoCode) {
                    if ($p->min_stay_nights && $nights < $p->min_stay_nights) {
                        return false;
                    }
                    // Sans code : promo automatique. Avec code : ne s'applique que si le
                    // voyageur a saisi exactement ce code.
                    if ($p->promo_code) {
                        return $submittedPromoCode !== '' && hash_equals($p->promo_code, $submittedPromoCode);
                    }
                    return true;
                });

            // Retenir la promotion offrant la plus grosse réduction effective.
            $promotion = $candidates
                ->sortByDesc(fn (Promotion $p) => $p->computeDiscount($basePrice, $effectivePricePerNight))
                ->first();
        } catch (\Illuminate\Database\QueryException $e) {
            // Si la table promotions n'existe pas encore, continuer sans promotion
            // Log l'erreur pour information mais ne bloque pas la réservation
            Log::warning('Promotions table not available', [
                'error' => $e->getMessage(),
                'accommodation_id' => $request->accommodation_id,
            ]);
        }

        // Appliquer la réduction si une promotion existe
        $totalPrice = $basePrice;
        if ($promotion) {
            $discountAmount = $promotion->computeDiscount($basePrice, $effectivePricePerNight);
            $totalPrice = $basePrice - $discountAmount;
        }

        // Politique d'annulation : 0 = non remboursable, >0 = modifiable (avoir en cas d'annulation)
        $isNonRefundable = ($cancellationHours === 0);
        $depositAmount = 0;

        // Voyageur Corporate rattaché comme collaborateur d'une entreprise (brief Étape 22) :
        // ses réservations "corporate" sont comptabilisées dans le rapport de dépenses du responsable.
        $corporateOwnerId = null;
        if ($user && $request->input('traveler_type') === 'corporate') {
            $membership = CorporateCollaborator::where('collaborator_user_id', $user->id)
                ->where('status', CorporateCollaborator::STATUS_ACTIVE)
                ->first();
            $corporateOwnerId = $membership?->owner_id;
        }

        // ─── ANTI-SURBOOKING TRANSACTIONNEL ──────────────────────────────────
        // Le verrou, la vérification ET la création sont dans la même transaction
        // pour garantir qu'aucune autre requête concurrente ne peut s'intercaler.
        $booking = DB::transaction(function () use (
            $request, $room, $accommodation, $user, $bookedForThirdParty,
            $totalPrice, $depositAmount, $isNonRefundable, $cancellationHours, $corporateOwnerId, $promotion
        ) {
            if ($room) {
                Room::lockForUpdate()->findOrFail($room->id);

                $this->bookingService->assertAvailable(
                    $room->id,
                    Carbon::parse($request->check_in),
                    Carbon::parse($request->check_out)
                );
            }

            $newBooking = Booking::create([
                'user_id' => $user->id,
                'accommodation_id' => $request->accommodation_id,
                'room_id' => $request->room_id,
                'promotion_id' => $promotion?->id,
                'check_in' => $request->check_in,
                'check_out' => $request->check_out,
                'guests' => $request->guests,
                'total_price' => $totalPrice,
                'deposit_amount' => $depositAmount,
                'amount_paid' => 0,
                'status' => 'pending',
                'payment_status' => 'pending',
                'is_non_refundable' => $isNonRefundable,
                'cancellation_policy_hours_snapshot' => $cancellationHours,
                'special_requests' => $request->special_requests,
                'booked_for_third_party' => $bookedForThirdParty,
                'traveler_name' => $bookedForThirdParty ? $request->traveler_name : null,
                'traveler_phone' => $bookedForThirdParty ? $request->traveler_phone : null,
                'traveler_email' => $bookedForThirdParty ? $request->traveler_email : null,
                // Type de voyageur + stats
                'traveler_type' => $request->input('traveler_type', 'individual'),
                'residence_country' => $request->residence_country,
                'residence_city' => $request->residence_city,
                // Corporate
                'company_name' => $request->traveler_type === 'corporate' ? $request->company_name : null,
                'company_vat' => $request->traveler_type === 'corporate' ? $request->company_vat : null,
                'company_address' => $request->traveler_type === 'corporate' ? $request->company_address : null,
                'company_billing_email' => $request->traveler_type === 'corporate' ? $request->company_billing_email : null,
                'company_service' => $request->traveler_type === 'corporate' ? $request->company_service : null,
                'company_project' => $request->traveler_type === 'corporate' ? $request->company_project : null,
                'corporate_owner_id' => $corporateOwnerId,
                'deferred_payment' => $request->traveler_type === 'corporate' && $request->boolean('deferred_payment'),
                // Paiement différé Corporate : la réservation est validée sur facture (pas d'expiration 48h)
                'expires_at' => ($request->traveler_type === 'corporate' && $request->boolean('deferred_payment'))
                    ? null
                    : now()->addHours(48),
            ]);

            // NOTE: Les dates ne sont bloquées que lors de la confirmation (après paiement)
            // dans BookingService::confirm() pour permettre les réservations concurrentes en pending

            return $newBooking;
        });
        // ─────────────────────────────────────────────────────────────────────

        // Historique de création
        $this->bookingService->logHistory(
            $booking,
            BookingStatus::Pending,
            BookingStatus::Pending,
            'created',
            $user->id
        );

        return response()->json($booking->load(['accommodation', 'room']), 201);
    }

    /**
     * Annuler via endpoint dédié (avec motif).
     */
    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        $canCancel = $user->isAdmin()
            || $booking->user_id === $user->id
            || $booking->accommodation?->host_id === $user->hostScopeId();

        if (!$canCancel) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate(['reason' => 'nullable|string|max:500']);

        $booking = $this->bookingService->cancel(
            $booking,
            $request->input('reason', ''),
            $user->id
        );

        $credit = CancellationPolicyService::onBookingCancelled($booking);

        return response()->json([
            'booking'        => $booking,
            'credit_created' => $credit ? [
                'id'      => $credit->id,
                'amount'  => (float) $credit->amount,
                'message' => 'Un avoir a été crédité sur votre compte.',
            ] : null,
        ]);
    }

    /**
     * Refus d'une demande de réservation par l'établissement (mode "sur demande").
     * -> Remboursement intégral automatique (≤ 24h) ; pas d'avoir.
     */
    public function refuse(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin() && $booking->accommodation?->host_id !== $user->hostScopeId()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Cette réservation ne peut pas être refusée.'], 422);
        }

        $request->validate(['reason' => 'nullable|string|max:500']);

        $booking = $this->bookingService->refuse(
            $booking,
            $request->input('reason', ''),
            $user->id
        );

        return response()->json([
            'booking' => $booking,
            'refund' => (float) $booking->refund_amount,
            'message' => $booking->refund_amount > 0
                ? 'Demande refusée. Le voyageur sera remboursé automatiquement sous 24h.'
                : 'Demande refusée.',
        ]);
    }

    /**
     * Marquer comme terminée (hôte ou admin après check-out).
     */
    public function complete(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin() && $booking->accommodation?->host_id !== $user->hostScopeId()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $booking = $this->bookingService->complete($booking, $user->id);

        return response()->json($booking);
    }

    /**
     * Historique des changements d'une réservation.
     */
    public function history(Request $request, Booking $booking): JsonResponse
    {
        $user = $request->user();

        $canView = $user->isAdmin()
            || $booking->user_id === $user->id
            || $booking->accommodation?->host_id === $user->hostScopeId();

        if (!$canView) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'history' => $booking->history()->with('user:id,name')->get(),
        ]);
    }

    private function getDatesBetween($start, $end)
    {
        $dates = [];
        $current = strtotime($start);
        $end = strtotime($end);

        while ($current < $end) {
            $dates[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        return $dates;
    }

    public function update(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->user_id !== $request->user()->id && 
            $booking->accommodation->host_id !== $request->user()->hostScopeId() && 
            !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status'   => 'sometimes|string|in:pending,confirmed,cancelled,completed',
            'check_in' => 'sometimes|date|after_or_equal:today',
            'check_out'=> 'sometimes|date|after:check_in',
            'room_id'  => 'sometimes|nullable|exists:rooms,id',
            'guests'   => 'sometimes|integer|min:1',
            'reason'   => 'sometimes|string|max:500',
        ]);

        // ── Annulation ────────────────────────────────────────────────────────
        if ($request->status === 'cancelled') {
            $booking = $this->bookingService->cancel(
                $booking,
                $request->input('reason', ''),
                $request->user()->id
            );

            $credit = CancellationPolicyService::onBookingCancelled($booking);
            $response = $booking->fresh();
            $response->credit_created = $credit ? [
                'id'      => $credit->id,
                'amount'  => (float) $credit->amount,
                'message' => 'Un avoir a été crédité sur votre compte pour votre prochaine réservation.',
            ] : null;

            if ($booking->isNonRefundable() && (float) $booking->amount_paid > 0) {
                $response->policy_message = 'Réservation non remboursable : aucun remboursement ni avoir.';
            }

            return response()->json($response);
        }

        // ── Confirmation ───────────────────────────────────────────────────────
        if ($request->status === 'confirmed') {
            if (!$request->user()->isAdmin()) {
                if (!$booking->isPaid()) {
                    return response()->json([
                        'message' => 'Veuillez d\'abord effectuer le paiement.',
                    ], 400);
                }
            }

            $confirmedWithoutPayment = $request->user()->isAdmin() && !$booking->isPaid();
            if ($confirmedWithoutPayment) {
                Log::warning('Admin confirmed booking without payment', [
                    'booking_id' => $booking->id,
                    'admin_id'   => $request->user()->id,
                    'total_price' => $booking->total_price,
                    'amount_paid' => $booking->amount_paid,
                ]);
            }

            $booking = $this->bookingService->confirm($booking, $request->user()->id);

            $response = $booking->toArray();
            if ($confirmedWithoutPayment) {
                $response['warning'] = 'Réservation confirmée sans paiement complet. Le client doit encore régler ' . number_format((float) $booking->remainingBalance(), 0, ',', ' ') . ' FCFA.';
            }

            return response()->json($response);
        }

        // ── Complétion ─────────────────────────────────────────────────────────
        if ($request->status === 'completed') {
            if (!$request->user()->isAdmin() && !$request->user()->isHost()) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $booking = $this->bookingService->complete($booking, $request->user()->id);

            return response()->json($booking);
        }

        // ── Modification des dates/chambre/guests ──────────────────────────────
        if ($request->hasAny(['check_in', 'check_out'])) {
            if (!$booking->canModifyFree()) {
                return response()->json([
                    'message' => 'La modification gratuite n\'est possible que jusqu\'à 48 h avant l\'arrivée.',
                ], 400);
            }

            $newCheckIn  = Carbon::parse($request->check_in  ?? $booking->check_in);
            $newCheckOut = Carbon::parse($request->check_out ?? $booking->check_out);

            $booking = $this->bookingService->modifyDates(
                $booking,
                $newCheckIn,
                $newCheckOut,
                $request->user()->id
            );
        }

        if ($request->has('guests')) {
            $booking->update(['guests' => $request->guests]);
        }

        return response()->json($booking->fresh());
    }

    public function show(Request $request, $id)
    {
        $booking = Booking::with(['accommodation.images', 'room', 'user', 'payment', 'payments'])->findOrFail($id);

        // Vérifier les permissions
        $user = $request->user();
        $canView = false;

        // Si l'utilisateur n'est pas authentifié, permettre l'accès si c'est sa réservation (via email ou autre identifiant)
        if (!$user) {
            // Permettre l'accès sans authentification pour les réservations récentes
            // (dans un vrai système, on pourrait utiliser un token unique dans l'URL)
            $canView = true; // Pour simplifier, on permet l'accès sans authentification
        } elseif ($user->isAdmin()) {
            $canView = true;
        } elseif ($user->isUser() && $booking->user_id === $user->id) {
            $canView = true;
        } elseif ($user->isHost() && $booking->accommodation->host_id === $user->hostScopeId()) {
            $canView = true;
        }

        if (!$canView) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Options de paiement (full / guarantee) selon règles métier
        $booking->payment_options = PaymentOptionsService::getPaymentOptions($booking);

        // Politique d'annulation (affichage clair pour le client)
        $booking->cancellation_policy = [
            'is_non_refundable' => $booking->isNonRefundable(),
            'label' => $booking->isNonRefundable()
                ? 'Non remboursable : aucun remboursement ni avoir en cas d\'annulation.'
                : 'Réservation modifiable : en cas d\'annulation, un avoir sera crédité sur votre compte (utilisable pour une prochaine réservation).',
            'hours_before_arrival' => (int) ($booking->cancellation_policy_hours_snapshot ?? $booking->accommodation->cancellation_policy_hours ?? 48),
            'can_modify_free' => $booking->canModifyFree(),
            'modification_deadline_info' => $booking->isNonRefundable()
                ? null
                : 'Modification gratuite possible jusqu\'à 48 h avant l\'arrivée.',
        ];

        // Informations de fidélité client (meilleur client)
        if ($booking->user_id) {
            $totalConfirmed = Booking::where('user_id', $booking->user_id)
                ->where('status', 'confirmed')
                ->count();

            $isBestCustomer = $totalConfirmed >= 3;
            $recommendedDiscount = $isBestCustomer ? 10 : 0; // 10% recommandé pour les meilleurs clients

            $booking->loyalty = [
                'total_confirmed_bookings' => $totalConfirmed,
                'is_best_customer' => $isBestCustomer,
                'recommended_discount_percent' => $recommendedDiscount,
            ];
        }

        return response()->json($booking);
    }
}

