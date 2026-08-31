<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\ClientCredit;
use Illuminate\Support\Facades\DB;

/**
 * Applique les politiques d'annulation :
 * - Non remboursable : aucun remboursement, aucun avoir.
 * - Modifiable : aucun remboursement en argent, avoir automatique pour le montant payé.
 */
class CancellationPolicyService
{
    /**
     * Traite l'annulation d'une réservation : met à jour le statut et crée un avoir si politique modifiable.
     * À appeler après avoir mis à jour status + payment_status sur le booking (ou cette méthode peut le faire).
     */
    public static function onBookingCancelled(Booking $booking): ?ClientCredit
    {
        $booking->refresh();

        // `status` est casté en enum BookingStatus (voir Booking::casts()) : le comparer à la
        // chaîne 'cancelled' via !== est TOUJOURS vrai (un enum n'est jamais === à un scalaire),
        // donc cette méthode retournait systématiquement null avant même d'être atteinte —
        // AUCUN avoir n'a jamais été créé automatiquement via ce chemin. Découvert le 2026-08-31
        // en testant le correctif de la condition de course ci-dessous (voir tinker : cette
        // méthode n'a jamais dépassé ce garde-fou en pratique).
        if ($booking->status !== BookingStatus::Cancelled) {
            return null;
        }

        $amountPaid = (float) $booking->amount_paid;
        if ($amountPaid <= 0) {
            return null;
        }

        if ($booking->isNonRefundable()) {
            \Log::info('Cancellation: non-refundable booking, no credit created', [
                'booking_id' => $booking->id,
                'amount_paid' => $amountPaid,
            ]);
            return null;
        }

        return DB::transaction(function () use ($booking, $amountPaid) {
            // Reverrouille la réservation le temps du contrôle anti-doublon + de la création :
            // sans ce verrou, deux appels concurrents (deux onglets, ou cancel()/update() tous
            // deux déclenchant onBookingCancelled() sur la même réservation) pouvaient tous les
            // deux passer le contrôle "aucun avoir existant" avant qu'aucun n'ait encore créé
            // le sien, produisant un avoir en double pour la même annulation.
            \App\Models\Booking::where('id', $booking->id)->lockForUpdate()->first();

            $existingCredit = ClientCredit::where('source_booking_id', $booking->id)
                ->where('source_type', ClientCredit::SOURCE_CANCELLATION)
                ->whereIn('status', [ClientCredit::STATUS_AVAILABLE, ClientCredit::STATUS_USED])
                ->first();

            if ($existingCredit) {
                return $existingCredit;
            }

            $credit = ClientCredit::create([
                'user_id' => $booking->user_id,
                'amount' => $amountPaid,
                'currency' => 'XOF',
                'source_booking_id' => $booking->id,
                'source_type' => ClientCredit::SOURCE_CANCELLATION,
                'status' => ClientCredit::STATUS_AVAILABLE,
                'note' => 'Avoir généré suite à l\'annulation de la réservation #' . $booking->id,
            ]);

            \Log::info('Credit created for cancelled modifiable booking', [
                'booking_id' => $booking->id,
                'credit_id' => $credit->id,
                'amount' => $amountPaid,
                'user_id' => $booking->user_id,
            ]);

            return $credit;
        });
    }
}
