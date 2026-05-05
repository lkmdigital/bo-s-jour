<?php

namespace App\Services;

use App\Models\Accommodation;

/**
 * Service de calcul des tarifs à partir du tarif de base.
 * Chaque plan tarifaire est une option que l'hôte peut activer/désactiver.
 *
 * Règles (uniquement pour les plans activés par l'hôte):
 * - Long séjour (si activé et >= N nuits) : base - Z%
 * - Non remboursable (si activé et cancellation_policy_hours = 0) : base - X%
 * - Modifiable (si activé et cancellation_policy_hours > 0) : base + Y%
 */
class RoomPricingService
{
    /**
     * Calcule le prix par nuit effectif selon le contexte de réservation.
     * N'applique que les plans que l'hôte a activés.
     *
     * @param float $basePrice Tarif de base (price_per_night)
     * @param int $cancellationPolicyHours Heures avant annulation gratuite (0 = non remboursable)
     * @param int $nights Nombre de nuits
     * @param Accommodation|null $accommodation Hébergement pour utiliser sa config tarifaire
     * @return float Prix par nuit après application des règles
     */
    public static function getEffectivePricePerNight(
        float $basePrice,
        int $cancellationPolicyHours,
        int $nights,
        ?Accommodation $accommodation = null
    ): float {
        $config = self::getConfig($accommodation);

        // Priorité 1: Long séjour (si activé)
        if ($config['long_stay_enabled'] && $nights >= $config['long_stay_nights']) {
            $discount = $config['long_stay_discount'];
            return round($basePrice * (1 - $discount / 100), 2);
        }

        // Priorité 2: Non remboursable (si activé)
        if ($config['non_refundable_enabled'] && $cancellationPolicyHours === 0) {
            $discount = $config['non_refundable_discount'];
            return round($basePrice * (1 - $discount / 100), 2);
        }

        // Priorité 3: Modifiable (si activé)
        if ($config['modifiable_enabled'] && $cancellationPolicyHours > 0) {
            $surcharge = $config['modifiable_surcharge'];
            return round($basePrice * (1 + $surcharge / 100), 2);
        }

        return round($basePrice, 2);
    }

    /**
     * Retourne la config tarifaire (plans activés + pourcentages).
     */
    private static function getConfig(?Accommodation $accommodation): array
    {
        $appConfig = config('room-pricing');
        $a = $accommodation;

        return [
            'non_refundable_enabled' => (bool) ($a->pricing_non_refundable_enabled ?? false),
            'non_refundable_discount' => (float) ($a->pricing_non_refundable_discount ?? $appConfig['non_refundable_discount_percent'] ?? 10),
            'modifiable_enabled' => (bool) ($a->pricing_modifiable_enabled ?? false),
            'modifiable_surcharge' => (float) ($a->pricing_modifiable_surcharge ?? $appConfig['modifiable_surcharge_percent'] ?? 10),
            'long_stay_enabled' => (bool) ($a->pricing_long_stay_enabled ?? false),
            'long_stay_discount' => (float) ($a->pricing_long_stay_discount ?? $appConfig['long_stay_discount_percent'] ?? 15),
            'long_stay_nights' => (int) ($a->pricing_long_stay_nights ?? $appConfig['long_stay_nights_threshold'] ?? 7),
        ];
    }

    /**
     * Retourne uniquement les plans tarifaires activés par l'hôte (pour affichage à la réservation).
     *
     * @param float $basePrice Tarif de base
     * @param Accommodation|null $accommodation Pour utiliser sa config
     * @return array base + variantes activées (non_refundable, modifiable, long_stay)
     */
    public static function getPriceVariants(float $basePrice, ?Accommodation $accommodation = null): array
    {
        $config = self::getConfig($accommodation);
        $result = [
            'enabled' => $config['non_refundable_enabled'] || $config['modifiable_enabled'] || $config['long_stay_enabled'],
            'base' => [
                'label' => 'Tarif de base',
                'price_per_night' => round($basePrice, 2),
                'adjustment' => 0,
                'adjustment_label' => null,
            ],
        ];

        if ($config['non_refundable_enabled']) {
            $d = $config['non_refundable_discount'];
            $result['non_refundable'] = [
                'label' => 'Tarif non remboursable',
                'price_per_night' => round($basePrice * (1 - $d / 100), 2),
                'adjustment' => -$d,
                'adjustment_label' => "-{$d}%",
            ];
        }

        if ($config['modifiable_enabled']) {
            $s = $config['modifiable_surcharge'];
            $result['modifiable'] = [
                'label' => 'Tarif modifiable',
                'price_per_night' => round($basePrice * (1 + $s / 100), 2),
                'adjustment' => $s,
                'adjustment_label' => "+{$s}%",
            ];
        }

        if ($config['long_stay_enabled']) {
            $d = $config['long_stay_discount'];
            $n = $config['long_stay_nights'];
            $result['long_stay'] = [
                'label' => 'Tarif long séjour (à partir de ' . $n . ' nuits)',
                'price_per_night' => round($basePrice * (1 - $d / 100), 2),
                'adjustment' => -$d,
                'adjustment_label' => "-{$d}%",
                'min_nights' => $n,
            ];
        }

        return $result;
    }
}
