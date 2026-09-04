<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;

/**
 * Vue globale des réservations pour l'admin (tous établissements/hôtes confondus).
 */
class AdminBookingController extends Controller
{
    public function index(Request $request)
    {
        $query = Booking::with(['user:id,name,email,phone', 'accommodation:id,name,city,host_id', 'accommodation.host:id,name', 'room:id,name', 'payments:id,booking_id,status']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Retour client 2026-09-02 (Partie 4.3) : "Les listes de réservations
        // doivent permettre la recherche par... statut de paiement" — seul le
        // statut de réservation était filtrable jusqu'ici.
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('city')) {
            $query->whereHas('accommodation', function ($q) use ($request) {
                $q->where('city', $request->city);
            });
        }

        if ($request->filled('accommodation_id')) {
            $query->where('accommodation_id', $request->accommodation_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('from_date')) {
            $query->where('check_in', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->where('check_out', '<=', $request->to_date);
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = (int) $request->get('per_page', 20);
        $bookings = $query->paginate($perPage);
        // Libellés enrichis (retour client 2026-09-02, Partie 4.4) — calculés à
        // partir des champs déjà chargés ci-dessus (payments inclus), donc pas
        // de requête N+1 supplémentaire ici.
        $bookings->getCollection()->each->append(['display_status_label', 'display_payment_status_label']);

        return response()->json([
            'data' => $bookings->items(),
            'pagination' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
            ],
        ]);
    }

    /**
     * Détails complets d'une réservation (paiements, historique des changements de statut).
     */
    public function show($id)
    {
        $booking = Booking::with([
            'user',
            'accommodation:id,name,city,address,host_id,establishment_code,breakfast_included,breakfast_included_persons',
            'accommodation.host:id,name,email,phone,whatsapp',
            'room:id,name,type,room_category',
            'payments',
            'history' => function ($q) {
                $q->latest();
            },
            'history.user:id,name',
            'clientCredits',
        ])->findOrFail($id);

        $booking->append(['display_status_label', 'display_payment_status_label']);

        return response()->json(['data' => $booking]);
    }

    /**
     * Liste des villes distinctes des établissements ayant des réservations (pour le filtre).
     */
    public function cities()
    {
        $cities = Booking::join('accommodations', 'bookings.accommodation_id', '=', 'accommodations.id')
            ->select('accommodations.city')
            ->distinct()
            ->orderBy('accommodations.city')
            ->pluck('city');

        return response()->json(['data' => $cities]);
    }
}
