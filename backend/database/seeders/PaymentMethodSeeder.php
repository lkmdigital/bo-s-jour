<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            [
                'name' => 'Wave CI',
                'slug' => 'wave-ci',
                'icon' => '/images/payment-methods/wave-ci.png',
                'description' => 'Payer avec Wave CI',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Visa/Mastercard',
                'slug' => 'visa-mastercard',
                'icon' => '/images/payment-methods/visa-mastercard.png',
                'description' => 'Payer avec votre carte Visa ou Mastercard',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Orange CI',
                'slug' => 'orange-ci',
                'icon' => '/images/payment-methods/orange-ci.png',
                'description' => 'Payer avec Orange Money',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Djamo',
                'slug' => 'djamo',
                'icon' => '/images/payment-methods/djamo.png',
                'description' => 'Payer avec Djamo',
                'is_active' => true,
                'sort_order' => 4,
            ],

            // TODO (paiement) : MTN Money et Moov Money (Flooz) sont à CONFIGURER plus tard.
            // Ne pas les activer ici tant que Malia Pay n'a pas fourni leurs codes de canaux
            // (voir $channelMap dans PaymentController::createPaymentLink). Exemple à décommenter :
            // [
            //     'name' => 'MTN MoMo', 'slug' => 'mtn-ci',
            //     'icon' => '/images/payment-methods/mtn_momo.png',
            //     'description' => 'Payer avec MTN Mobile Money',
            //     'is_active' => true, 'sort_order' => 5,
            // ],
            // [
            //     'name' => 'Moov Money', 'slug' => 'moov-ci',
            //     'icon' => '/images/payment-methods/moov.png',
            //     'description' => 'Payer avec Moov Money (Flooz)',
            //     'is_active' => true, 'sort_order' => 6,
            // ],
        ];

        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(
                ['slug' => $method['slug']],
                $method
            );
        }
    }
}

