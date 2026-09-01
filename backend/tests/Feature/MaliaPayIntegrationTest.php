<?php

namespace Tests\Feature;

use App\Http\Controllers\PaymentController;
use App\Mail\StuckPaymentsDigest;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Migration MaliaPay (business.malia.ci, 2026-09-01) : création de paiement,
 * vérification de statut, et le filet de sécurité contre un webhook qui n'arrive
 * jamais (découverte du même jour : 30 paiements sur 31 restés "pending" depuis
 * mai faute de webhook reçu avec l'ancienne intégration malia-pay.com).
 */
class MaliaPayIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private function configureMaliaPay(bool $sandbox = true): void
    {
        Config::set('services.malia_pay.api_url', 'https://business.malia.ci/api');
        Config::set('services.malia_pay.api_key', 'sk_test_fake');
        Config::set('services.malia_pay.merchant_id', 'MI_TEST');
        Config::set('services.malia_pay.sandbox', $sandbox);
    }

    public function test_initiate_payment_uses_sandbox_endpoint_and_stores_transaction_id(): void
    {
        $this->configureMaliaPay(sandbox: true);

        Http::fake([
            'business.malia.ci/api/v1/test' => Http::response([
                'status' => 'success',
                'link' => '',
                'transaction_id' => 'FAKE_TX_SANDBOX_1',
                'montant' => 50000,
                'channel' => 'WAVECI',
                'reference' => 'REF-1',
            ], 201),
        ]);

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'total_price' => 50000,
            'deposit_amount' => 50000,
        ]);

        Sanctum::actingAs($traveler);

        $response = $this->postJson("/api/bookings/{$booking->id}/payment/initiate", [
            'payment_method' => 'wave-ci',
        ]);

        $response->assertOk();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://business.malia.ci/api/v1/test'
                && $request->hasHeader('X-API-Key', 'sk_test_fake')
                && $request['channel'] === 'WAVECI';
        });

        $payment = Payment::where('booking_id', $booking->id)->first();
        $this->assertNotNull($payment);
        $this->assertSame('FAKE_TX_SANDBOX_1', $payment->transaction_id);
    }

    public function test_initiate_payment_uses_live_endpoint_when_sandbox_disabled(): void
    {
        $this->configureMaliaPay(sandbox: false);

        Http::fake([
            'business.malia.ci/api/v1/payments' => Http::response([
                'status' => 'pending',
                'link' => 'https://business.malia.ci/checkout/FAKE_TX_LIVE_1',
                'transaction_id' => 'FAKE_TX_LIVE_1',
            ], 201),
        ]);

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'total_price' => 75000,
            'deposit_amount' => 75000,
        ]);

        Sanctum::actingAs($traveler);

        $response = $this->postJson("/api/bookings/{$booking->id}/payment/initiate", [
            'payment_method' => 'orange-ci',
        ]);

        $response->assertOk();
        $response->assertJsonPath('link', 'https://business.malia.ci/checkout/FAKE_TX_LIVE_1');

        Http::assertSent(fn ($request) => $request->url() === 'https://business.malia.ci/api/v1/payments'
            && $request['channel'] === 'OMCI');
    }

    public function test_webhook_confirms_payment_on_success_status(): void
    {
        $this->configureMaliaPay();

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending']);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 50000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-SUCCESS-1',
        ]);

        $response = $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-SUCCESS-1',
            'status' => 'success',
            'transaction_id' => 'FAKE_TX_2',
            'montant' => 50000,
        ]);

        $response->assertOk();
        $payment->refresh();
        $this->assertSame('completed', $payment->status);
        $this->assertSame('FAKE_TX_2', $payment->transaction_id);
        $this->assertSame('webhook', $payment->payment_data['confirmation_source']);
    }

    public function test_webhook_ignores_processing_status_without_marking_failed(): void
    {
        $this->configureMaliaPay();

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending']);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 30000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'orange-ci',
            'payment_reference' => 'REF-PROCESSING-1',
        ]);

        $response = $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-PROCESSING-1',
            'status' => 'processing',
        ]);

        $response->assertOk();
        $payment->refresh();
        // Toujours "pending" — un statut intermédiaire ne doit JAMAIS être traité
        // comme un échec (bug qu'aurait introduit l'ancienne logique if/else binaire).
        $this->assertSame('pending', $payment->status);
    }

    public function test_webhook_marks_failed_on_failed_status(): void
    {
        $this->configureMaliaPay();

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending']);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 20000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'djamo',
            'payment_reference' => 'REF-FAILED-1',
        ]);

        $response = $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-FAILED-1',
            'status' => 'failed',
        ]);

        $response->assertStatus(400);
        $payment->refresh();
        $this->assertSame('failed', $payment->status);
    }

    public function test_check_transaction_status_returns_null_on_http_failure(): void
    {
        $this->configureMaliaPay();

        Http::fake([
            'business.malia.ci/api/v1/payments/*' => Http::response(['message' => 'not found'], 404),
        ]);

        $result = app(PaymentController::class)->checkTransactionStatus('UNKNOWN_TX');

        $this->assertNull($result);
    }

    public function test_admin_can_confirm_pending_payment_manually(): void
    {
        $this->configureMaliaPay();

        $admin = User::factory()->create(['role' => 'admin']);
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending']);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 40000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-MANUAL-1',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/payments/{$payment->id}/confirm-manually", [
            'transaction_id' => 'MANUAL_TX_1',
            'note' => 'Vérifié dans le dashboard MaliaPay le 2026-09-01',
        ]);

        $response->assertOk();
        $payment->refresh();
        $this->assertSame('completed', $payment->status);
        $this->assertSame('MANUAL_TX_1', $payment->transaction_id);
        $this->assertSame('admin_manual', $payment->payment_data['confirmation_source']);
    }

    public function test_flag_stuck_pending_command_auto_confirms_via_malia_status_check(): void
    {
        $this->configureMaliaPay();
        Mail::fake();

        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending']);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 60000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-STUCK-1',
            'transaction_id' => 'STUCK_TX_1',
        ]);
        // 'created_at' n'est pas dans $fillable (Payment) : create() l'ignore
        // silencieusement (voir memory feedback-fillable-after-migration) — forcer
        // l'ancienneté après coup pour dépasser le seuil "--hours".
        $payment->forceFill(['created_at' => now()->subHours(10), 'updated_at' => now()->subHours(10)])->save();

        Http::fake([
            'business.malia.ci/api/v1/payments/STUCK_TX_1' => Http::response([
                'transaction_id' => 'STUCK_TX_1',
                'status' => 'success',
                'montant' => '60000.00',
            ], 200),
        ]);

        $this->artisan('payments:flag-stuck-pending', ['--hours' => 6])
            ->assertSuccessful();

        $payment->refresh();
        $this->assertSame('completed', $payment->status);
        // Une confirmation réussie déclenche les e-mails normaux de réservation
        // (BookingConfirmation/HostNewBooking, effet de bord attendu de
        // confirmPaymentSuccess) — mais surtout PAS le digest d'alerte admin,
        // puisque tout a été résolu automatiquement sans intervention humaine.
        Mail::assertNotSent(StuckPaymentsDigest::class);
    }

    public function test_flag_stuck_pending_command_alerts_admin_when_no_transaction_id(): void
    {
        $this->configureMaliaPay();
        Mail::fake();

        User::factory()->create(['role' => 'admin', 'email' => 'admin-test@example.com']);
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['payment_status' => 'pending']);
        $oldPayment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 15000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-OLD-1',
            // Pas de transaction_id : paiement de l'ancienne intégration, non vérifiable.
        ]);
        $oldPayment->forceFill(['created_at' => now()->subHours(10), 'updated_at' => now()->subHours(10)])->save();

        $this->artisan('payments:flag-stuck-pending', ['--hours' => 6])
            ->assertSuccessful();

        Mail::assertSent(StuckPaymentsDigest::class);
    }
}
