<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Activer WhatsApp (envoi des messages) ne doit pas rendre obligatoire la vérification du numéro
 * du voyageur à la réservation : celle-ci demande un modèle Meta « Authentification » approuvé et
 * un réglage à part. Incident du 2026-10-16 : « WhatsApp activé » bloquait toutes les réservations.
 */
class WhatsAppPhoneVerificationSwitchTest extends TestCase
{
    use RefreshDatabase;

    private function enableWhatsApp(): void
    {
        Setting::set('whatsapp_enabled', true, 'boolean');
        Setting::set('whatsapp_token', 'token-test', 'string');
        Setting::set('whatsapp_phone_id', '1234567890', 'string');
    }

    public function test_enabling_whatsapp_does_not_make_phone_verification_mandatory(): void
    {
        $this->enableWhatsApp();

        $this->getJson('/api/settings/public')->assertJsonPath('whatsapp_verification_enabled', false);
        $this->getJson('/api/booking/whatsapp-otp/status')->assertJsonPath('available', false);
        $this->postJson('/api/booking/whatsapp-otp/send', ['phone' => '+2250161133466'])->assertStatus(422);
    }

    public function test_phone_verification_needs_its_own_switch(): void
    {
        $this->enableWhatsApp();
        Setting::set('whatsapp_otp_enabled', true, 'boolean');

        $this->getJson('/api/settings/public')->assertJsonPath('whatsapp_verification_enabled', true);
        $this->getJson('/api/booking/whatsapp-otp/status')->assertJsonPath('available', true);
    }

    public function test_the_verification_switch_alone_is_not_enough_without_whatsapp(): void
    {
        Setting::set('whatsapp_otp_enabled', true, 'boolean');

        $this->getJson('/api/settings/public')->assertJsonPath('whatsapp_verification_enabled', false);
    }
}
