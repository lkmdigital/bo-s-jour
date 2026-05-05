<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tarification automatique des chambres
    |--------------------------------------------------------------------------
    |
    | À partir du tarif de base saisi par l'hôtelier, le système calcule
    | automatiquement les déclinaisons tarifaires selon le type de réservation.
    | Les ajustements sont configurés en pourcentage.
    |
    */

    // Réduction pour le tarif non remboursable (cancellation_policy_hours = 0)
    'non_refundable_discount_percent' => (float) env('PRICING_NON_REFUNDABLE_DISCOUNT', 10),

    // Surcoût pour le tarif modifiable (cancellation_policy_hours > 0)
    'modifiable_surcharge_percent' => (float) env('PRICING_MODIFIABLE_SURCHARGE', 10),

    // Réduction pour le tarif long séjour (réservation >= 7 nuits)
    'long_stay_discount_percent' => (float) env('PRICING_LONG_STAY_DISCOUNT', 15),

    // Seuil en nuits pour considérer un long séjour
    'long_stay_nights_threshold' => (int) env('PRICING_LONG_STAY_NIGHTS', 7),
];
