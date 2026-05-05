<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Commission;
use Illuminate\Http\Request;

class HostCheckInController extends Controller
{
    /**
     * Marquer l'arrivée d'un client (début du séjour) via le code réservation.
     * À ce moment le montant passe en "revenu disponible" pour l'hôte (released_at sur la commission).
     */
    public function store(Request $request)
    {
        $request->validate([
            'confirmation_code' => 'required|string|size:8',
        ]);

        $code = strtoupper(trim($request->confirmation_code));
        $hostId = $request->user()->id;

        $booking = Booking::with(['accommodation', 'user'])
            ->where('confirmation_code', $code)
            ->whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('status', 'confirmed')
            ->whereNull('checked_in_at')
            ->first();

        if (!$booking) {
            return response()->json([
                'message' => 'Code invalide, réservation introuvable ou déjà enregistrée.',
            ], 404);
        }

        $booking->checked_in_at = now();
        $booking->save();

        $commission = Commission::where('booking_id', $booking->id)->first();
        if ($commission) {
            $commission->released_at = now();
            $commission->save();
        }

        return response()->json([
            'message' => 'Arrivée enregistrée. Début du séjour marqué.',
            'booking' => $booking->load(['accommodation:id,name', 'room:id,name']),
        ]);
    }
}
