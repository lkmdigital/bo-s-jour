<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Setting;
use Carbon\Carbon;

/**
 * Options de paiement d'une réservation — SOURCE UNIQUE pour tout le parcours :
 * paramétrage établissement → fiche publique → récapitulatif → page de paiement →
 * confirmation. Le libellé annoncé et le montant prélevé sortent du même calcul.
 *
 * Décisions BoSéjour du 2026-10-08 :
 * - « Paiement intégral » : 100 % en ligne, avec réduction (5 % par défaut).
 * - « Garantie de réservation » : montant défini par l'établissement — 1re nuit,
 *   pourcentage du séjour ou montant fixe — le solde se règle à l'établissement,
 *   à l'arrivée. Le terme est « Garantie », pas « Acompte ».
 * - Le remboursement suit la politique d'annulation choisie par l'établissement
 *   (pas de règle globale) : ce service n'affirme donc rien à ce sujet.
 *
 * Paiement intégral obligatoire (la garantie n'est pas proposée) :
 * - arrivée dans moins de 48 h ;
 * - séjour de 7 nuits ou plus ;
 * - politique stricte / non remboursable (cancellation_policy_hours = 0) ;
 * - l'établissement ne propose pas de garantie (deposit_required = false) ;
 * - la garantie paramétrée atteint ou dépasse le total du séjour.
 *
 * Point laissé ouvert par BoSéjour : garantie inférieure à la commission. Aucun
 * plancher n'est appliqué ici, pour que le montant annoncé soit exactement le
 * montant prélevé ; guaranteeCoversCommission() permet de repérer ces cas.
 */
class PaymentOptionsService
{
    public const LONG_STAY_NIGHTS = 7;
    public const HOURS_BEFORE_FULL_ONLY = 48;
    public const DEFAULT_FULL_DISCOUNT_PERCENT = 5;

    public const TYPE_FIRST_NIGHT = 'first_night';
    public const TYPE_PERCENTAGE = 'percentage';
    public const TYPE_FIXED = 'fixed';
    public const GUARANTEE_TYPES = [self::TYPE_FIRST_NIGHT, self::TYPE_PERCENTAGE, self::TYPE_FIXED];

    public const FULL_LABEL = 'Paiement intégral';
    public const GUARANTEE_LABEL = 'Garantie de réservation';

    /**
     * Paramétrage normalisé de la garantie d'un établissement.
     * Un type sans valeur exploitable (pourcentage ou montant absent) retombe sur
     * la 1re nuit, valeur historique : le libellé suit, il reste donc cohérent.
     *
     * @return array{enabled: bool, type: string, percentage: ?float, fixed_amount: ?float}
     */
    public static function guaranteeConfig(?Accommodation $accommodation): array
    {
        $enabled = $accommodation === null || $accommodation->deposit_required === null
            ? true
            : (bool) $accommodation->deposit_required;

        $type = $accommodation?->deposit_amount ?: self::TYPE_FIRST_NIGHT;
        $percentage = (float) ($accommodation?->deposit_percentage ?? 0);
        $fixed = (float) ($accommodation?->deposit_fixed_amount ?? 0);

        if (!in_array($type, self::GUARANTEE_TYPES, true)
            || ($type === self::TYPE_PERCENTAGE && !($percentage > 0 && $percentage < 100))
            || ($type === self::TYPE_FIXED && !($fixed > 0))) {
            $type = self::TYPE_FIRST_NIGHT;
        }

        return [
            'enabled' => $enabled,
            'type' => $type,
            'percentage' => $type === self::TYPE_PERCENTAGE ? $percentage : null,
            'fixed_amount' => $type === self::TYPE_FIXED ? round($fixed) : null,
        ];
    }

    /**
     * Garantie prête à afficher, sans dates (fiche publique, formulaires, confirmation).
     */
    public static function describeGuarantee(?Accommodation $accommodation): array
    {
        $config = self::guaranteeConfig($accommodation);

        if (!$config['enabled']) {
            return $config + [
                'label' => self::FULL_LABEL,
                'summary' => 'Paiement intégral en ligne',
                'description' => 'Le montant total du séjour est réglé en ligne au moment de la réservation.',
            ];
        }

        $summary = self::guaranteeSummary($config);
        $online = match ($config['type']) {
            self::TYPE_PERCENTAGE => $summary . ' sont réglés en ligne',
            self::TYPE_FIXED => $summary . ' sont réglés en ligne',
            default => 'la 1re nuit est réglée en ligne',
        };

        return $config + [
            'label' => self::GUARANTEE_LABEL,
            'summary' => $summary,
            'description' => self::GUARANTEE_LABEL . ' : ' . $online
                . ' ; le solde se règle directement à l\'établissement, à l\'arrivée.',
        ];
    }

    /** Libellé court du montant de la garantie : « 1re nuit », « 30 % du séjour », « 50 000 FCFA ». */
    public static function guaranteeSummary(array $config): string
    {
        return match ($config['type']) {
            self::TYPE_PERCENTAGE => self::formatPercent((float) $config['percentage']) . ' % du séjour',
            self::TYPE_FIXED => self::formatAmount((float) $config['fixed_amount']) . ' FCFA',
            default => '1re nuit',
        };
    }

    /** Montant de la garantie pour un séjour donné, en FCFA entiers (c'est le montant prélevé). */
    public static function guaranteeAmount(array $config, float $totalPrice, int $nights): float
    {
        return match ($config['type']) {
            self::TYPE_PERCENTAGE => round($totalPrice * (float) $config['percentage'] / 100),
            self::TYPE_FIXED => round((float) $config['fixed_amount']),
            default => round($totalPrice / max(1, $nights)),
        };
    }

    /** La garantie couvre-t-elle la commission de la plateforme ? (point ouvert côté BoSéjour) */
    public static function guaranteeCoversCommission(float $guaranteeAmount, float $totalPrice): bool
    {
        $rate = max(8.0, min(10.0, (float) Setting::get('commission_rate', 10.00)));

        return $guaranteeAmount >= round($totalPrice * $rate / 100, 2);
    }

    /**
     * Options de paiement d'une réservation existante.
     */
    public static function getPaymentOptions(Booking $booking): array
    {
        $accommodation = $booking->accommodation;

        return self::computeOptions(
            (float) $booking->total_price,
            Carbon::parse($booking->check_in),
            Carbon::parse($booking->check_out),
            (int) ($accommodation->cancellation_policy_hours ?? 48),
            self::guaranteeConfig($accommodation)
        );
    }

    /**
     * Aperçu des options avant création de la réservation (fiche établissement /
     * price-preview) — mêmes règles que getPaymentOptions(), sans Booking persistée.
     */
    public static function previewPaymentOptions(
        float $totalPrice,
        string $checkIn,
        string $checkOut,
        ?int $cancellationPolicyHours = null,
        ?Accommodation $accommodation = null
    ): array {
        return self::computeOptions(
            $totalPrice,
            Carbon::parse($checkIn),
            Carbon::parse($checkOut),
            $cancellationPolicyHours ?? 48,
            self::guaranteeConfig($accommodation)
        );
    }

    private static function computeOptions(float $totalPrice, Carbon $checkIn, Carbon $checkOut, int $cancellationHours, array $config): array
    {
        $nights = (int) $checkIn->diffInDays($checkOut);
        $hoursUntilCheckIn = now()->diffInHours($checkIn, false);

        $discountPercent = (float) Setting::get('full_payment_discount_percent', self::DEFAULT_FULL_DISCOUNT_PERCENT);
        $fullAmount = round($totalPrice * (1 - $discountPercent / 100));

        $full = [
            'label' => self::FULL_LABEL,
            'amount' => $fullAmount,
            'original_amount' => $totalPrice,
            'discount_percent' => $discountPercent,
            'description' => $discountPercent > 0
                ? 'Payez la totalité maintenant et bénéficiez de ' . self::formatPercent($discountPercent) . ' % de réduction.'
                : 'Payez la totalité maintenant.',
        ];

        $guaranteeAmount = self::guaranteeAmount($config, $totalPrice, $nights);

        $reason = match (true) {
            $hoursUntilCheckIn < self::HOURS_BEFORE_FULL_ONLY => 'réservation moins de 48h avant l\'arrivée',
            $nights >= self::LONG_STAY_NIGHTS => 'séjour long (' . $nights . ' nuits)',
            $cancellationHours === 0 => 'réservation non remboursable',
            !$config['enabled'] => 'cet établissement demande le paiement intégral',
            $guaranteeAmount >= $totalPrice => 'la garantie demandée couvre la totalité du séjour',
            default => null,
        };

        $describedConfig = $config + ['summary' => $config['enabled'] ? self::guaranteeSummary($config) : null];

        if ($reason !== null) {
            return [
                'full_only' => true,
                'reason' => $reason,
                'options' => ['full' => $full],
                'guarantee' => null,
                'guarantee_config' => $describedConfig,
            ];
        }

        $balance = round($totalPrice - $guaranteeAmount);

        return [
            'full_only' => false,
            'reason' => null,
            'options' => [
                'full' => $full,
                'guarantee' => [
                    'label' => self::GUARANTEE_LABEL,
                    'amount' => $guaranteeAmount,
                    'type' => $config['type'],
                    // « 1re nuit », « 30 % du séjour » ou « 50 000 FCFA » : le paramétrage de l'établissement
                    'summary' => self::guaranteeSummary($config),
                    'percent_of_total' => $totalPrice > 0 ? round($guaranteeAmount / $totalPrice * 100, 0) : 0,
                    'description' => 'Payez uniquement la garantie demandée par l\'établissement et réglez le solde directement à l\'établissement à votre arrivée.',
                    'balance_at_hotel' => $balance,
                ],
            ],
            'guarantee' => [
                'amount' => $guaranteeAmount,
                'balance_at_hotel' => $balance,
            ],
            'guarantee_config' => $describedConfig,
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

    private static function formatAmount(float $amount): string
    {
        return number_format($amount, 0, ',', ' ');
    }

    private static function formatPercent(float $percent): string
    {
        return rtrim(rtrim(number_format($percent, 2, ',', ''), '0'), ',');
    }
}
