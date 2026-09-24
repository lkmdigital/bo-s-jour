<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class WhatsAppWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function configure(): void
    {
        Setting::set('whatsapp_verify_token', 'mon-jeton', 'string', 'test');
        Setting::set('whatsapp_app_secret', 'secret-app', 'string', 'test');
    }

    private function signedPost(array $payload, string $secret = 'secret-app')
    {
        $body = json_encode($payload);
        return $this->call('POST', '/api/whatsapp/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256=' . hash_hmac('sha256', $body, $secret),
        ], $body);
    }

    public function test_verification_returns_the_challenge_when_token_matches(): void
    {
        $this->configure();

        $this->get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=mon-jeton&hub.challenge=12345')
            ->assertOk()
            ->assertSee('12345', false);
    }

    public function test_verification_is_refused_with_wrong_or_missing_token(): void
    {
        $this->configure();

        $this->get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=1')->assertForbidden();

        Setting::set('whatsapp_verify_token', '', 'string', 'test');
        $this->get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=&hub.challenge=1')->assertForbidden();
    }

    public function test_events_with_invalid_signature_are_rejected(): void
    {
        $this->configure();

        $this->signedPost(['entry' => []], 'mauvais-secret')->assertForbidden();
    }

    public function test_events_are_rejected_when_no_app_secret_is_configured(): void
    {
        Setting::set('whatsapp_app_secret', '', 'string', 'test');

        $this->signedPost(['entry' => []], '')->assertForbidden();
    }

    public function test_failed_status_is_logged_with_meta_error(): void
    {
        $this->configure();
        Log::spy();

        $this->signedPost(['entry' => [['changes' => [['value' => ['statuses' => [[
            'id' => 'wamid.X', 'status' => 'failed', 'recipient_id' => '2250161133466',
            'errors' => [['code' => 131047, 'title' => 'Re-engagement message']],
        ]]]]]]]])->assertOk();

        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($msg, $ctx) => $msg === 'WhatsApp message NON livré' && $ctx['code'] === 131047 && $ctx['wamid'] === 'wamid.X')
            ->once();
    }

    public function test_delivered_status_is_logged_as_info(): void
    {
        $this->configure();
        Log::spy();

        $this->signedPost(['entry' => [['changes' => [['value' => ['statuses' => [[
            'id' => 'wamid.Y', 'status' => 'delivered', 'recipient_id' => '2250161133466',
        ]]]]]]]])->assertOk();

        Log::shouldHaveReceived('info')
            ->withArgs(fn ($msg, $ctx) => $msg === 'WhatsApp statut du message' && $ctx['status'] === 'delivered')
            ->once();
    }
}
