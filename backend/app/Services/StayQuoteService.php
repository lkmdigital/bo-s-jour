<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Room;
use Carbon\Carbon;

/**
 * Devis d'un séjour : prix effectif par nuit, total, remise long séjour et options de
 * paiement (paiement intégral / garantie de réservation).
 *
 * Source unique du calcul, partagée par l'aperçu de prix de la fiche et du récapitulatif
 * (AccommodationController::pricePreview) et par l'assistant IA voyageur : ils annoncent
 * ainsi exactement les mêmes montants que la page de paiement.
 */
class StayQuoteService
{
    /**
     * @param int|null $roomId chambre choisie ; sans chambre, le tarif de base de l'établissement s'applique
     * @param int $extraBreakfastQuantity petits-déjeuners supplémentaires (entrent dans le total payé)
     */
    public static function quote(
        Accommodation $accommodation,
        ?int $roomId,
        string $checkIn,
        string $checkOut,
        int $roomsQuantity = 1,
        int $extraBreakfastQuantity = 0
    ): array {
        $roomsQuantity = max(1, $roomsQuantity);

        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));
        $cancellationHours = $accommodation->cancellation_policy_hours ?? 48;

        $basePricePerNight = $accommodation->price_per_night;
        $room = null;

        if ($roomId) {
            $room = Room::where('accommodation_id', $accommodation->id)->where('is_active', true)->find($roomId);
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
        $matchedLongStayTier = null;
        $hoursUntilCheckIn = now()->diffInHours(Carbon::parse($checkIn), false);
        $longStayTiers = is_array($accommodation->pricing_long_stay_tiers ?? null) ? $accommodation->pricing_long_stay_tiers : null;
        if ($accommodation->pricing_long_stay_enabled && $longStayTiers) {
            $matchedLongStayTier = RoomPricingService::resolveLongStayTier($longStayTiers, $nights);
            if ($matchedLongStayTier) {
                $rateType = 'long_stay';
            }
        } elseif ($accommodation->pricing_long_stay_enabled) {
            $longStayNights = (int) ($accommodation->pricing_long_stay_nights ?? config('room-pricing.long_stay_nights_threshold', 7));
            if ($nights >= $longStayNights) {
                $rateType = 'long_stay';
            }
        }
        if ($rateType === 'base' && $accommodation->pricing_non_refundable_enabled && $cancellationHours === 0) {
            $rateType = 'non_refundable';
        } elseif ($rateType === 'base' && $accommodation->pricing_modifiable_enabled && $cancellationHours > 0 && $hoursUntilCheckIn >= $cancellationHours) {
            $rateType = 'modifiable';
        }

        $total = round($effectivePricePerNight * $nights * $roomsQuantity, 2);
        $variants = RoomPricingService::getPriceVariants((float) $basePricePerNight, $accommodation);
        // Même total que celui que BookingController enregistrera (petits-déjeuners compris)
        $extraBreakfastTotal = 0.0;
        if ($extraBreakfastQuantity > 0 && (float) $accommodation->breakfast_price > 0) {
            $extraBreakfastTotal = $extraBreakfastQuantity * (float) $accommodation->breakfast_price;
        }
        $paymentOptions = PaymentOptionsService::previewPaymentOptions(
            $total + $extraBreakfastTotal, $checkIn, $checkOut, (int) $cancellationHours, $accommodation
        );

        // Détail de la remise long séjour appliquée (retour client 2026-09-02,
        // Partie 3.3 : "3 nuitées x 26 000 FCFA : 78 000 FCFA / Remise séjour
        // longue durée (3-5 nuits 5%): -3 900 FCFA / TOTAL À PAYER : 74 100 FCFA").
        $longStayDiscount = null;
        if ($rateType === 'long_stay' && $matchedLongStayTier) {
            $subtotal = round((float) $basePricePerNight * $nights * $roomsQuantity, 2);
            $discountPercent = (float) $matchedLongStayTier['discount_percent'];
            $discountAmount = round($subtotal - $total, 2);
            $min = (int) ($matchedLongStayTier['min_nights'] ?? 0);
            $max = isset($matchedLongStayTier['max_nights']) && $matchedLongStayTier['max_nights'] !== null
                ? (int) $matchedLongStayTier['max_nights'] : null;
            $rangeLabel = $max ? "{$min}-{$max} nuits" : "{$min}+ nuits";
            $longStayDiscount = [
                'subtotal' => $subtotal,
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'label' => "Remise séjour longue durée ({$rangeLabel} {$discountPercent}%)",
            ];
        }

        return [
            'base_price_per_night' => (float) $basePricePerNight,
            'effective_price_per_night' => $effectivePricePerNight,
            'nights' => $nights,
            'total' => $total,
            'extra_breakfast_total' => $extraBreakfastTotal,
            'rate_type' => $rateType,
            'long_stay_discount' => $longStayDiscount,
            'cancellation_policy_hours' => $cancellationHours,
            'variants' => $variants,
            'payment_options' => $paymentOptions,
        ];
    }
}
