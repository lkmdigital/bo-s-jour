<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Accommodation;
use App\Models\Setting;
use Carbon\Carbon;

/**
 * Service pour déterminer les options de paiement selon les règles métier.
 *
 * Option A - Paiement intégral: 100% avec réduction, commission immédiate, confirmation auto
 * Option B - Garantie: 1ère nuitée (≥ commission), solde à l'hôtel, non remboursable
 *
 * Règles automatiques:
 * - < 48h avant arrivée → paiement intégral obligatoire
 * - Long séjour (> 7 nuits) → paiement intégral obligatoire
 * - Non remboursable (cancellation_policy_hours = 0) → paiement intégral obligatoire
 * - Modifiable (cancellation_policy_hours > 0) → les deux options
 */
class PaymentOptionsService
{
    public const LONG_STAY_NIGHTS = 7;
    public const HOURS_BEFORE_FULL_ONLY = 48;
    public const DEFAULT_FULL_DISCOUNT_PERCENT = 5;
    public const GUARANTEE_PERCENT_MODIFIABLE = 20;

    /**
     * Détermine les options de paiement disponibles pour une réservation.
     */
    public static function getPaymentOptions(Booking $booking): array
    {
        $accommodation = $booking->accommodation;
        $checkIn = Carbon::parse($booking->check_in);
        $nights = $checkIn->diffInDays(Carbon::parse($booking->check_out));
        $hoursUntilCheckIn = now()->diffInHours($checkIn, false);
        $cancellationHours = $accommodation->cancellation_policy_hours ?? 48;

        $commissionRate = max(8.0, min(10.0, (float) Setting::get('commission_rate', 10.00)));
        $fullDiscountPercent = (float) Setting::get('full_payment_discount_percent', self::DEFAULT_FULL_DISCOUNT_PERCENT);

        $totalPrice = (float) $booking->total_price;
        $pricePerNight = $totalPrice / max(1, $nights);
        $firstNight = round($pricePerNight, 2);
        $commissionAmount = round($totalPrice * $commissionRate / 100, 2);
        $fullAmountWithDiscount = round($totalPrice * (1 - $fullDiscountPercent / 100), 2);

        $isModifiable = $cancellationHours > 0;
        $isNonRefundable = $cancellationHours === 0;
        $isLastMinute = $hoursUntilCheckIn < self::HOURS_BEFORE_FULL_ONLY;
        $isLongStay = $nights >= self::LONG_STAY_NIGHTS;

        // Règle 1: < 48h avant arrivée → paiement intégral obligatoire
        if ($isLastMinute) {
            return [
                'full_only' => true,
                'reason' => 'réservation moins de 48h avant l\'arrivée',
                'options' => [
                    'full' => [
                        'label' => 'Paiement intégral',
                        'amount' => $fullAmountWithDiscount,
                        'original_amount' => $totalPrice,
                        'discount_percent' => $fullDiscountPercent,
                        'description' => 'Payez 100% du montant avec ' . $fullDiscountPercent . '% de réduction. Réservation confirmée immédiatement.',
                    ],
                ],
                'guarantee' => null,
            ];
        }

        // Règle 2: Long séjour → paiement intégral obligatoire
        if ($isLongStay) {
            return [
                'full_only' => true,
                'reason' => 'séjour long (' . $nights . ' nuits)',
                'options' => [
                    'full' => [
                        'label' => 'Paiement intégral',
                        'amount' => $fullAmountWithDiscount,
                        'original_amount' => $totalPrice,
                        'discount_percent' => $fullDiscountPercent,
                        'description' => 'Payez 100% du montant avec ' . $fullDiscountPercent . '% de réduction. Réservation confirmée immédiatement.',
                    ],
                ],
                'guarantee' => null,
            ];
        }

        // Règle 3: Non remboursable → paiement intégral obligatoire
        if ($isNonRefundable) {
            return [
                'full_only' => true,
                'reason' => 'réservation non remboursable',
                'options' => [
                    'full' => [
                        'label' => 'Paiement intégral',
                        'amount' => $fullAmountWithDiscount,
                        'original_amount' => $totalPrice,
                        'discount_percent' => $fullDiscountPercent,
                        'description' => 'Payez 100% du montant avec ' . $fullDiscountPercent . '% de réduction. Réservation confirmée immédiatement.',
                    ],
                ],
                'guarantee' => null,
            ];
        }

        // Règle 4: Modifiable → les deux options
        $guaranteeAmount = max($firstNight, $commissionAmount);

        return [
            'full_only' => false,
            'reason' => null,
            'options' => [
                'full' => [
                    'label' => 'Paiement intégral',
                    'amount' => $fullAmountWithDiscount,
                    'original_amount' => $totalPrice,
                    'discount_percent' => $fullDiscountPercent,
                    'description' => 'Payez 100% du montant avec ' . $fullDiscountPercent . '% de réduction. Réservation confirmée immédiatement.',
                ],
                'guarantee' => [
                    'label' => 'Garantir ma réservation (' . self::GUARANTEE_PERCENT_MODIFIABLE . ' % pour les réservations modifiables)',
                    'amount' => $guaranteeAmount,
                    'percent_of_total' => round($guaranteeAmount / $totalPrice * 100, 0),
                    'description' => 'Payez la première nuitée sur la plateforme. Le solde est payable directement à l\'hôtel à l\'arrivée. Ce paiement n\'est pas remboursable.',
                    'balance_at_hotel' => round($totalPrice - $guaranteeAmount, 2),
                ],
            ],
            'guarantee' => [
                'amount' => $guaranteeAmount,
                'balance_at_hotel' => round($totalPrice - $guaranteeAmount, 2),
            ],
        ];
    }

    /**
     * Vérifie si une réservation impose le paiement intégral uniquement.
     */
    public static function isFullPaymentOnly(Booking $booking): bool
    {
        $options = self::getPaymentOptions($booking);
        return $options['full_only'] ?? true;
    }
}
