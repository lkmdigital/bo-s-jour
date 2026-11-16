<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Setting;

/**
 * Règle de solde d'un paiement intégral : le voyageur règle le montant de l'option « payer la totalité » (total moins la réduction
 * annoncée, `full_payment_discount_percent`, 5 % par défaut) — pas 100 % du total_price. Quand ce montant est encaissé, la
 * réservation est soldée ; la réduction est financée par boséjour : le tarif plein de l'hôte (base_price, sur lequel se calculent
 * la commission et son net) est conservé, comme pour les autres remises.
 */
final class PaymentSettlement
{
    /** Écart toléré (arrondis à l'unité de la monnaie). */
    private const TOLERANCE = 1.0;

    /** Vrai si le montant déjà encaissé couvre le prix de la réservation, réduction de paiement intégral comprise. */
    public static function fullPaymentCovers(Booking $booking): bool
    {
        $total = (float) $booking->total_price;
        $paid = (float) $booking->amount_paid;
        if ($total <= 0) {
            return false;
        }
        if ($paid >= $total - self::TOLERANCE) {
            return true;
        }

        $percent = (float) Setting::get('full_payment_discount_percent', PaymentOptionsService::DEFAULT_FULL_DISCOUNT_PERCENT);
        $expected = round($total * (1 - max(0.0, min($percent, 100.0)) / 100));

        // Le montant réellement demandé à l'initiation du paiement fait foi si le réglage a changé entre-temps.
        if ($booking->payment_type === 'full' && (float) $booking->deposit_amount > 0) {
            $expected = min($expected, round((float) $booking->deposit_amount));
        }

        return $paid >= $expected - self::TOLERANCE;
    }

    /** Ramène le prix dû au montant effectivement réglé (réduction consentie) : plus de « reste à payer ». */
    public static function applyFullPaymentDiscount(Booking $booking): void
    {
        $total = (float) $booking->total_price;
        $paid = (float) $booking->amount_paid;

        if ($paid > 0 && $paid < $total) {
            // Réservations anciennes sans tarif plein enregistré : on le garde avant de réduire le total.
            $booking->base_price = $booking->base_price ?? $total;
            $booking->total_price = $paid;
        }
    }
}
