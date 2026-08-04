<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Room;
use Carbon\Carbon;

/**
 * Service de calcul des tarifs à partir du tarif de base.
 * Chaque plan tarifaire est une option que l'hôte peut activer/désactiver.
 *
 * Règles (uniquement pour les plans activés par l'hôte):
 * - Long séjour (si activé et >= N nuits) : base - Z%
 * - Non remboursable (si activé et cancellation_policy_hours = 0) : base - X%
 * - Modifiable (si activé, cancellation_policy_hours > 0 ET check-in dans la fenêtre d'annulation) : base + Y%
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
     * @param string|null $checkIn Date de check-in (Y-m-d) pour vérifier la fenêtre d'annulation réelle
     * @return float Prix par nuit après application des règles
     */
    public static function getEffectivePricePerNight(
        float $basePrice,
        int $cancellationPolicyHours,
        int $nights,
        ?Accommodation $accommodation = null,
        ?string $checkIn = null
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
        // La majoration ne s'applique que si le client bénéficie réellement de la fenêtre d'annulation,
        // c'est-à-dire si le check-in est encore dans le futur à plus de cancellationPolicyHours.
        if ($config['modifiable_enabled'] && $cancellationPolicyHours > 0) {
            $hasRealWindow = true;
            if ($checkIn !== null) {
                $hoursUntilCheckIn = now()->diffInHours(\Carbon\Carbon::parse($checkIn), false);
                $hasRealWindow = $hoursUntilCheckIn >= $cancellationPolicyHours;
            }
            if ($hasRealWindow) {
                $surcharge = $config['modifiable_surcharge'];
                return round($basePrice * (1 + $surcharge / 100), 2);
            }
        }

        return round($basePrice, 2);
    }

    /**
     * Prix de base par nuit pour chaque date d'un séjour (tarification par période).
     * Priorité pour chaque nuit :
     *   1. price_override du jour (room_availabilities)
     *   2. période tarifaire active couvrant la date (room_price_periods)
     *   3. tarif de base de la chambre (price_per_night)
     *
     * @param Room $room
     * @param string $checkIn Date d'arrivée (Y-m-d), incluse
     * @param string $checkOut Date de départ (Y-m-d), exclue
     * @return array<string, float> prix par date (clé Y-m-d)
     */
    public static function getNightlyBasePrices(Room $room, string $checkIn, string $checkOut): array
    {
        $start = Carbon::parse($checkIn)->startOfDay();
        $end = Carbon::parse($checkOut)->startOfDay();

        if ($end->lte($start)) {
            return [];
        }

        $periods = $room->pricePeriods()
            ->where('is_active', true)
            ->where('start_date', '<', $end->toDateString())
            ->where('end_date', '>=', $start->toDateString())
            ->orderBy('start_date')
            ->get();

        $overrides = $room->availabilities()
            ->whereNotNull('price_override')
            ->where('date', '>=', $start->toDateString())
            ->where('date', '<', $end->toDateString())
            ->get()
            ->mapWithKeys(fn ($a) => [$a->date->toDateString() => (float) $a->price_override]);

        $prices = [];
        $cursor = $start->copy();
        while ($cursor->lt($end)) {
            $dateStr = $cursor->toDateString();

            if (isset($overrides[$dateStr])) {
                $prices[$dateStr] = $overrides[$dateStr];
            } else {
                $period = $periods->first(fn ($p) => $p->coversDate($dateStr));
                $prices[$dateStr] = $period
                    ? (float) $period->price_per_night
                    : (float) $room->price_per_night;
            }

            $cursor->addDay();
        }

        return $prices;
    }

    /**
     * Prix de base moyen par nuit sur un séjour, en tenant compte des périodes
     * tarifaires. Ce prix moyen remplace price_per_night comme base de calcul :
     * moyenne × nuits = somme exacte des tarifs nuit par nuit.
     */
    public static function getAverageBasePricePerNight(Room $room, string $checkIn, string $checkOut): float
    {
        $prices = self::getNightlyBasePrices($room, $checkIn, $checkOut);

        if (empty($prices)) {
            return (float) $room->price_per_night;
        }

        return round(array_sum($prices) / count($prices), 2);
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
