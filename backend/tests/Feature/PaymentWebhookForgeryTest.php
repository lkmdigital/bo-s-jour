<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Reproduit le scénario signalé par l'audit de sécurité externe (2026-09-27,
 * Phase 6 - Paiements) : sans MALIA_PAY_WEBHOOK_SECRET configuré,
 * verifyWebhookSignature() acceptait n'importe quel appelant, et le webhook
 * confirmait un paiement sur la seule foi du statut "success" déclaré dans le
 * corps de la requête, jamais vérifié auprès de Malia Pay. Un attaquant
 * connaissant une référence de paiement pouvait donc se faire confirmer une
 * réservation gratuitement en simulant cet appel.
 *
 * Correctif : confirmSuccessClaimedByWebhook() redemande toujours le statut
 * réel à Malia Pay (via notre propre X-API-Key, non falsifiable par
 * l'appelant du webhook) avant de confirmer quoi que ce soit.
 */
class PaymentWebhookForgeryTest extends TestCase
{
    use RefreshDatabase;

    private function configureMaliaPay(): void
    {
        Config::set('services.malia_pay.api_url', 'https://business.malia.ci/api');
        Config::set('services.malia_pay.api_key', 'sk_test_fake');
        Config::set('services.malia_pay.webhook_secret', ''); // état actuel de la production
    }

    public function test_a_forged_webhook_does_not_confirm_the_payment_without_secret_configured(): void
    {
        $this->configureMaliaPay();

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending', 'total_price' => 200000]);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 200000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-FORGE-1',
            'transaction_id' => 'txn-real-1', // affecté à la création, comme tous les paiements depuis le 2026-09-01
        ]);

        // Malia Pay dit la vérité : cette transaction n'est PAS un succès.
        Http::fake([
            'business.malia.ci/api/v1/payments/*' => Http::response(['status' => 'pending'], 200),
        ]);

        // L'attaquant simule le webhook, sans connaître aucun secret (il n'y en a pas).
        $response = $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-FORGE-1',
            'status' => 'success',
            'transaction_id' => 'txn-invente-par-attaquant',
            'montant' => 200000,
        ]);

        $response->assertOk(); // pas d'erreur bruyante, mais surtout :
        $payment->refresh();
        $booking->refresh();
        $this->assertSame('pending', $payment->status, 'le paiement ne doit PAS être confirmé sans confirmation indépendante de Malia Pay');
        $this->assertNotSame('paid', $booking->payment_status);

        // Le transaction_id enregistré à la création n'a jamais été écrasé par celui,
        // arbitraire, fourni dans le corps du webhook.
        $this->assertSame('txn-real-1', $payment->transaction_id);
    }

    public function test_reusing_someone_elses_real_but_smaller_transaction_does_not_fully_pay_a_bigger_booking(): void
    {
        $this->configureMaliaPay();

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending', 'total_price' => 200000]);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 200000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-FORGE-2',
            'transaction_id' => 'txn-real-2',
        ]);

        // Malia Pay confirme un succès réel, mais pour un tout petit montant (celui que
        // l'attaquant a réellement payé sur SA propre transaction).
        Http::fake([
            'business.malia.ci/api/v1/payments/*' => Http::response(['status' => 'success', 'transaction_id' => 'txn-real-2', 'montant' => 500], 200),
        ]);

        $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-FORGE-2',
            'status' => 'success',
            'transaction_id' => 'txn-dun-autre-paiement',
            'montant' => 200000, // l'attaquant réclame un montant qu'il n'a jamais payé
        ])->assertOk();

        $booking->refresh();
        $payment->refresh();
        $this->assertSame(500.0, (float) $payment->amount, 'seul le montant rapporté par Malia Pay compte, jamais celui du corps du webhook');
        $this->assertNotSame('paid', $booking->payment_status);
    }
}
