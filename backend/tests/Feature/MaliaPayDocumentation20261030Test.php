<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Mise à jour de la documentation MaliaPay du 2026-10-30 : notifications signées (clé API), notification
 * envoyée une seule fois (10 s, sans nouvel envoi), statuts qui évoluent (failed puis success), statut
 * pending_otp, MTN sans redirection, PeyaPay (code reçu par SMS), erreurs 401/422/502 et vérification de
 * la référence avant de valider. Aucun appel réseau réel (Http::fake).
 */
class MaliaPayDocumentation20261030Test extends TestCase
{
    use RefreshDatabase;

    private const KEY = 'sk_test_fake';

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.malia_pay.api_url', 'https://business.malia.ci/api');
        Config::set('services.malia_pay.api_key', self::KEY);
        Config::set('services.malia_pay.merchant_id', 'MI_TEST');
        Config::set('services.malia_pay.sandbox', false);
        Config::set('services.malia_pay.require_signature', false);
    }

    private function pendingPayment(string $reference = 'REF-DOC-1', string $status = 'pending', int $amount = 50000, array $booking = []): Payment
    {
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create($booking + ['payment_status' => 'pending', 'total_price' => $amount, 'deposit_amount' => $amount]);

        return Payment::create([
            'booking_id' => $booking->id, 'user_id' => $traveler->id, 'amount' => $amount, 'status' => $status,
            'purpose' => 'full', 'payment_method' => 'wave-ci', 'payment_reference' => $reference, 'transaction_id' => 'TX-' . $reference,
        ]);
    }

    /** Envoie une notification signée comme le fait MaliaPay : HMAC-SHA256 de « {timestamp}.{corps brut} » avec la clé API. */
    private function signedWebhook(array $body, ?int $timestamp = null, string $key = self::KEY)
    {
        $raw = json_encode($body);
        $ts = (string) ($timestamp ?? time());

        return $this->call('POST', '/api/payments/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_MALIAPAY_TIMESTAMP' => $ts,
            'HTTP_X_MALIAPAY_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $ts . '.' . $raw, $key),
        ], $raw);
    }

    /** Une nouvelle simulation à chaque appel : sinon la première réponse enregistrée pour une adresse reste prioritaire. */
    private function fakeHttp(array $map): void
    {
        Http::swap(new HttpFactory());
        Http::fake($map);
    }

    private function malia(string $status, ?string $reference = 'REF-DOC-1', int $montant = 50000): void
    {
        $this->fakeHttp(['business.malia.ci/api/v1/payments/*' => Http::response(array_filter(['status' => $status, 'reference' => $reference, 'montant' => (string) $montant . '.00', 'transaction_id' => 'TX-' . $reference]), 200)]);
    }

    // --- Signature des notifications ---------------------------------------------------------------------------

    public function test_a_correctly_signed_notification_is_processed(): void
    {
        $payment = $this->pendingPayment();
        $this->malia('success');

        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'success', 'transaction_id' => 'TX-REF-DOC-1'])->assertOk();

        $this->assertSame('completed', $payment->fresh()->status);
    }

    public function test_a_notification_signed_with_the_wrong_key_or_too_old_is_rejected(): void
    {
        $payment = $this->pendingPayment();
        $this->malia('success');

        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'success'], null, 'une-autre-cle')->assertStatus(401);
        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'success'], time() - 301)->assertStatus(401);   // rejeu
        $this->postJson('/api/payments/webhook', ['reference' => 'REF-DOC-1', 'status' => 'success'], ['X-MaliaPay-Timestamp' => (string) time(), 'X-MaliaPay-Signature' => 'sha256=faux'])->assertStatus(401);

        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_unsigned_notifications_are_accepted_by_default_but_refused_once_signature_is_required(): void
    {
        $this->pendingPayment();
        $this->malia('processing');

        $this->postJson('/api/payments/webhook', ['reference' => 'REF-DOC-1', 'status' => 'processing'])->assertOk();

        Config::set('services.malia_pay.require_signature', true);
        $this->postJson('/api/payments/webhook', ['reference' => 'REF-DOC-1', 'status' => 'processing'])->assertStatus(401);
    }

    // --- Statuts : intermédiaires, échec puis succès tardif ----------------------------------------------------

    public function test_pending_otp_is_an_intermediate_status_not_a_failure(): void
    {
        $payment = $this->pendingPayment();

        $this->postJson('/api/payments/webhook', ['reference' => 'REF-DOC-1', 'status' => 'pending_otp'])->assertOk();

        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_a_failed_payment_that_the_operator_confirms_later_becomes_completed(): void
    {
        $payment = $this->pendingPayment();
        $this->malia('failed');
        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'failed'])->assertOk();
        $this->assertSame('failed', $payment->fresh()->status);

        // Dix minutes plus tard, l'opérateur confirme : nouvelle notification « success ».
        $this->malia('success');
        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'success'])->assertOk();

        $this->assertSame('completed', $payment->fresh()->status);
        $this->assertSame('paid', $payment->booking->fresh()->payment_status);
    }

    public function test_a_failure_announced_while_maliapay_says_the_payment_is_still_running_is_ignored(): void
    {
        $payment = $this->pendingPayment();
        $this->malia('processing');

        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'failed'])->assertOk();

        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_an_unverifiable_unsigned_failure_is_ignored_but_a_signed_one_is_recorded(): void
    {
        $unsigned = $this->pendingPayment('REF-UNSIGNED');
        $signed = $this->pendingPayment('REF-SIGNED');
        $this->fakeHttp(['business.malia.ci/api/v1/payments/*' => Http::response(['message' => 'indisponible'], 500)]);

        $this->postJson('/api/payments/webhook', ['reference' => 'REF-UNSIGNED', 'status' => 'failed'])->assertOk();
        $this->signedWebhook(['reference' => 'REF-SIGNED', 'status' => 'failed'])->assertOk();

        $this->assertSame('pending', $unsigned->fresh()->status);   // jamais « échoué » sur parole : la réconciliation tranchera
        $this->assertSame('failed', $signed->fresh()->status);
    }

    public function test_a_failure_on_a_second_payment_does_not_undo_a_booking_already_guaranteed(): void
    {
        $payment = $this->pendingPayment('REF-DOC-1', 'pending', 50000, ['payment_status' => 'guarantee_paid']);
        $this->malia('failed');

        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'failed'])->assertOk();

        $this->assertSame('failed', $payment->fresh()->status);
        $this->assertSame('guarantee_paid', $payment->booking->fresh()->payment_status);
    }

    public function test_a_success_reported_for_another_reference_does_not_confirm_the_payment(): void
    {
        $payment = $this->pendingPayment();
        $this->malia('success', 'UNE-AUTRE-REFERENCE');
        Log::spy();

        $this->signedWebhook(['reference' => 'REF-DOC-1', 'status' => 'success'])->assertOk();

        $this->assertSame('pending', $payment->fresh()->status);
        Log::shouldHaveReceived('error')->withArgs(fn ($m) => str_contains($m, 'AUTRE référence'))->once();
    }

    public function test_returning_to_the_payment_page_rereads_pending_and_failed_payments(): void
    {
        $late = $this->pendingPayment('REF-LATE', 'failed');
        $this->malia('success', 'REF-LATE');
        $this->getJson("/api/payments/{$late->id}")->assertOk()->assertJsonPath('status', 'completed');

        $gone = $this->pendingPayment('REF-GONE');
        $this->malia('failed', 'REF-GONE');
        $this->getJson("/api/payments/{$gone->id}")->assertOk()->assertJsonPath('status', 'failed');   // l'attente MTN / PeyaPay le voit
    }

    // --- Création : MTN, PeyaPay, erreurs ----------------------------------------------------------------------

    private function traveler(int $amount = 20000): array
    {
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create(['total_price' => $amount, 'deposit_amount' => $amount]);
        Sanctum::actingAs($traveler);

        return [$traveler, $booking];
    }

    public function test_mtn_has_no_redirection_and_waits_for_the_customer_to_validate_on_the_phone(): void
    {
        $this->fakeHttp(['business.malia.ci/api/v1/payments' => Http::response([
            'status' => 'pending', 'message' => 'Transaction créée.', 'transaction_id' => 'TX-MTN', 'link' => '', 'pay_token' => '',
            'fees' => ['montant_net' => 19600, 'frais_malia' => 200, 'frais_operateur' => 200, 'total_fees' => 400],
        ], 201)]);
        [, $booking] = $this->traveler();

        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'mtn-ci'])
            ->assertOk()
            ->assertJsonPath('awaiting_phone_validation', true)
            ->assertJsonPath('requires_otp', false)
            ->assertJsonPath('link', '');

        $payment = Payment::where('booking_id', $booking->id)->first();
        $this->assertSame('TX-MTN', $payment->transaction_id);
        $this->assertSame(400, $payment->payment_data['fees']['total_fees']);
        Http::assertSent(fn ($r) => $r->hasHeader('Accept', 'application/json') && $r['channel'] === 'MTNCI');

        // Un second clic, MaliaPay indiquant que la demande est toujours en cours, ne déclenche pas une
        // seconde notification sur le téléphone du client (ni une seconde transaction).
        $this->fakeHttp(['business.malia.ci/api/v1/payments/*' => Http::response(['status' => 'pending', 'reference' => $payment->payment_reference], 200)]);
        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'mtn-ci'])->assertOk()->assertJsonPath('awaiting_phone_validation', true);
        Http::assertNotSent(fn ($r) => $r->method() === 'POST');

        // En revanche, si MaliaPay dit que la demande a échoué, un nouvel essai crée bien une nouvelle demande.
        $this->fakeHttp([
            'business.malia.ci/api/v1/payments/*' => Http::response(['status' => 'failed', 'reference' => $payment->payment_reference], 200),
            'business.malia.ci/api/v1/payments' => Http::response(['status' => 'pending', 'transaction_id' => 'TX-MTN-2', 'link' => ''], 201),
        ]);
        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'mtn-ci'])->assertOk()->assertJsonPath('awaiting_phone_validation', true);
        Http::assertSent(fn ($r) => $r->method() === 'POST');
        $this->assertSame('TX-MTN-2', $payment->fresh()->transaction_id);
    }

    public function test_the_mtn_channel_code_can_follow_the_documentation_without_redeploying(): void
    {
        Config::set('services.malia_pay.mtn_channel', 'MTNCII');
        $this->fakeHttp(['business.malia.ci/api/v1/payments' => Http::response(['status' => 'pending', 'transaction_id' => 'TX-MTN2', 'link' => ''], 201)]);
        [, $booking] = $this->traveler();

        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'mtn-ci'])->assertOk();

        Http::assertSent(fn ($r) => $r['channel'] === 'MTNCII');
    }

    public function test_a_redirect_channel_without_a_link_is_still_an_error(): void
    {
        $this->fakeHttp(['business.malia.ci/api/v1/payments' => Http::response(['status' => 'pending', 'transaction_id' => 'TX-W', 'link' => ''], 201)]);
        [, $booking] = $this->traveler();

        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'wave-ci'])
            ->assertStatus(502)
            ->assertJsonPath('error', "Impossible d'obtenir le lien de paiement. Veuillez réessayer.");
    }

    public function test_peyapay_sends_the_code_then_verifies_it_and_confirms_after_rereading_the_status(): void
    {
        $this->fakeHttp([
            'business.malia.ci/api/v1/peyapay/init' => Http::response([
                'status' => 'otp_required', 'requiresOtp' => true, 'transaction_id' => 'TX-PEYA', 'peyapay_transaction_id' => 12345,
                'fees' => ['montant_net' => 19600, 'frais_malia' => 200, 'frais_operateur' => 200, 'total_fees' => 400],
            ], 201),
            'business.malia.ci/api/v1/peyapay/verify' => Http::response(['status' => 'success'], 200),
        ]);
        [, $booking] = $this->traveler();

        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'peya-pay'])
            ->assertOk()
            ->assertJsonPath('requires_otp', true)
            ->assertJsonPath('awaiting_phone_validation', false);

        $payment = Payment::where('booking_id', $booking->id)->first();
        $this->assertSame(12345, $payment->payment_data['peyapay_transaction_id']);

        $this->fakeHttp([
            'business.malia.ci/api/v1/peyapay/verify' => Http::response(['status' => 'success'], 200),
            'business.malia.ci/api/v1/payments/*' => Http::response(['status' => 'success', 'reference' => $payment->payment_reference, 'montant' => '20000.00'], 200),
        ]);
        $this->postJson("/api/bookings/{$booking->id}/payment/peyapay/verify", ['otp_code' => '123456'])
            ->assertOk()
            ->assertJsonPath('status', 'completed');

        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/v1/peyapay/verify') && $r['peyapay_transaction_id'] === 12345 && $r['otp_code'] === '123456');
        $this->assertSame('completed', $payment->fresh()->status);
    }

    public function test_a_wrong_peyapay_code_is_refused_with_a_clear_message_and_the_format_is_validated(): void
    {
        $this->fakeHttp(['business.malia.ci/api/v1/peyapay/verify' => Http::response(['status' => 'error', 'message' => 'OTP invalide'], 422)]);
        [, $booking] = $this->traveler();
        $payment = Payment::create(['booking_id' => $booking->id, 'user_id' => $booking->user_id, 'amount' => 20000, 'status' => 'pending', 'purpose' => 'full',
            'payment_method' => 'peya-pay', 'payment_reference' => 'REF-PEYA', 'transaction_id' => 'TX-PEYA', 'payment_data' => ['peyapay_transaction_id' => 777]]);

        $this->postJson("/api/bookings/{$booking->id}/payment/peyapay/verify", ['otp_code' => 'abc'])->assertStatus(422);   // format
        $this->postJson("/api/bookings/{$booking->id}/payment/peyapay/verify", ['otp_code' => '000000'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'Code incorrect ou expiré. Veuillez vérifier le code reçu par SMS puis réessayer.');
        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_gateway_errors_are_turned_into_clear_messages_and_the_real_cause_is_logged(): void
    {
        Log::spy();
        [, $booking] = $this->traveler();

        $this->fakeHttp(['business.malia.ci/api/v1/payments' => Http::response(['status' => 'error', 'message' => 'Gateway error. Please try again.', 'reason' => 'Moov en maintenance'], 502)]);
        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'wave-ci'])
            ->assertStatus(502)
            ->assertJsonPath('error', 'Ce moyen de paiement est momentanément indisponible. Veuillez en choisir un autre ou réessayer dans quelques minutes.');

        $this->fakeHttp(['business.malia.ci/api/v1/payments' => Http::response(['status' => 'error', 'message' => 'Clé API invalide ou marchand inactif.'], 401)]);
        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'wave-ci'])
            ->assertStatus(503)
            ->assertJsonPath('error', 'Le paiement en ligne est momentanément indisponible. Veuillez réessayer plus tard.');
        Log::shouldHaveReceived('critical')->withArgs(fn ($m) => str_contains($m, 'clé API refusée'))->once();

        $this->fakeHttp(['business.malia.ci/api/v1/payments' => Http::response(['message' => 'Canal non supporté', 'errors' => ['channel' => ['Canal non supporté']]], 422)]);
        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'wave-ci'])
            ->assertStatus(422)
            ->assertJsonPath('error', "Ce moyen de paiement n'est pas disponible pour le moment. Veuillez en choisir un autre.");
    }

    public function test_an_amount_under_the_gateway_minimum_is_refused_before_calling_it(): void
    {
        $this->fakeHttp([]);
        [, $booking] = $this->traveler(50);

        $this->postJson("/api/bookings/{$booking->id}/payment/initiate", ['payment_method' => 'wave-ci'])
            ->assertStatus(400)
            ->assertJsonPath('message', 'Le montant à régler est inférieur au minimum accepté par la passerelle de paiement (100 FCFA).');
        Http::assertNothingSent();
    }
}
