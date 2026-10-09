<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\AiModule;
use App\Services\TravelerAiAssistantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Module IA : un seul interrupteur admin (`ai_enabled`). Désactivé, toutes les routes IA
 * disparaissent ; activé, il faut encore une clé API pour que les assistants répondent.
 * Aucun de ces tests n'appelle l'API Claude.
 */
class AiModuleSwitchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.anthropic.api_key' => '']);
    }

    private function enable(bool $withKey = false): void
    {
        Setting::set('ai_enabled', true, 'boolean');
        if ($withKey) {
            Setting::set('anthropic_api_key', 'sk-ant-test', 'string');
        }
    }

    public function test_module_is_off_by_default_and_every_ai_route_is_hidden(): void
    {
        $this->assertFalse(AiModule::enabled());

        $this->postJson('/api/assistant/ask', ['question' => 'Un hôtel à Assinie ?'])->assertStatus(404);

        Sanctum::actingAs(User::factory()->create(['role' => 'user']));
        $this->postJson('/api/me/ai/ask', ['question' => 'Mes réservations ?'])->assertStatus(404);

        Sanctum::actingAs(User::factory()->create(['role' => 'host']));
        $this->postJson('/api/host/ai/ask', ['question' => 'Mon taux d’occupation ?'])->assertStatus(404);
        $this->postJson('/api/host/ai/content/translate', ['text' => 'Bonjour'])->assertStatus(404);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->postJson('/api/admin/ai/ask', ['question' => 'Établissements en attente ?'])->assertStatus(404);
    }

    public function test_public_settings_only_announce_ai_when_enabled_and_a_key_is_set(): void
    {
        $this->getJson('/api/settings/public')->assertJsonPath('ai_enabled', false);

        $this->enable();
        $this->getJson('/api/settings/public')->assertJsonPath('ai_enabled', false);

        $this->enable(withKey: true);
        $response = $this->getJson('/api/settings/public')
            ->assertJsonPath('ai_enabled', true)
            ->assertJsonPath('ai_guest_enabled', true);

        // La clé ne sort jamais par l'API publique.
        $this->assertStringNotContainsString('sk-ant-test', $response->getContent());
    }

    public function test_enabled_without_a_key_answers_not_configured_instead_of_failing(): void
    {
        $this->enable();

        $this->postJson('/api/assistant/ask', ['question' => 'Un hôtel à Assinie ?'])
            ->assertStatus(503)
            ->assertJsonPath('message', "Le module IA n'est pas encore configuré. Réessayez plus tard.");
    }

    public function test_guests_are_asked_to_log_in_when_the_admin_closes_the_assistant_to_them(): void
    {
        $this->enable(withKey: true);
        Setting::set('ai_guest_enabled', false, 'boolean');

        $this->getJson('/api/settings/public')->assertJsonPath('ai_guest_enabled', false);
        $this->postJson('/api/assistant/ask', ['question' => 'Un hôtel à Assinie ?'])
            ->assertStatus(401)
            ->assertJsonPath('login_required', true);
    }

    public function test_guests_are_capped_per_day_before_any_billed_call(): void
    {
        $this->enable(withKey: true);
        $key = 'ai-guest-ip:' . sha1('127.0.0.1') . ':' . now()->toDateString();
        for ($i = 0; $i < AiModule::GUEST_DAILY_LIMIT_PER_IP; $i++) {
            RateLimiter::hit($key, 3600);
        }

        $this->postJson('/api/assistant/ask', ['question' => 'Un hôtel à Assinie ?'])
            ->assertStatus(429)
            ->assertJsonPath('login_required', true);
    }

    public function test_the_global_daily_cap_for_guests_is_configurable(): void
    {
        $this->enable(withKey: true);
        Setting::set('ai_guest_daily_limit', 0, 'integer');

        $this->postJson('/api/assistant/ask', ['question' => 'Un hôtel à Assinie ?'])->assertStatus(429);
    }

    public function test_a_guest_only_gets_public_tools_and_no_web_search(): void
    {
        $guest = new TravelerAiAssistantService(null);
        $traveler = new TravelerAiAssistantService(User::factory()->create(['role' => 'user']));

        $names = fn (TravelerAiAssistantService $s) => array_column($this->callProtected($s, 'toolDefinitions'), 'name');

        $this->assertSame(
            ['search_accommodations', 'get_accommodation_details', 'compare_accommodations'],
            $names($guest)
        );
        $this->assertContains('get_my_bookings', $names($traveler));
        $this->assertContains('web_search', $names($traveler));

        // Défense en profondeur : même demandé par le modèle, un outil de compte est refusé.
        $this->assertStringContainsString(
            'Connexion requise',
            $this->callProtected($guest, 'executeTool', ['get_my_bookings', []])
        );
        $this->assertStringContainsString("n'est PAS connecté", $this->callProtected($guest, 'systemPrompt'));
        $this->assertStringNotContainsString("n'est PAS connecté", $this->callProtected($traveler, 'systemPrompt'));
    }

    public function test_admin_can_switch_the_module_and_choose_the_model(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->putJson('/api/settings/admin', [
            'ai_enabled' => true,
            'anthropic_api_key' => 'sk-ant-test',
            'anthropic_model' => 'claude-haiku-5-5',
            'ai_guest_enabled' => false,
            'ai_guest_daily_limit' => 50,
        ])->assertOk();

        $this->assertTrue(AiModule::available());
        $this->assertSame('claude-haiku-5-5', AiModule::model());
        $this->assertFalse(AiModule::guestsAllowed());
        $this->assertSame(50, AiModule::guestDailyLimit());

        $this->getJson('/api/settings/admin')
            ->assertJsonPath('ai_enabled', true)
            ->assertJsonPath('ai_configured', true)
            ->assertJsonPath('anthropic_model', 'claude-haiku-5-5');

        // Vide = retour au modèle par défaut de la configuration.
        $this->putJson('/api/settings/admin', ['anthropic_model' => null])->assertOk();
        $this->assertSame(config('services.anthropic.model'), AiModule::model());

        $this->putJson('/api/settings/admin', ['anthropic_model' => 'gpt-4'])->assertStatus(422);

        $this->putJson('/api/settings/admin', ['ai_enabled' => false])->assertOk();
        $this->postJson('/api/admin/ai/ask', ['question' => 'Établissements en attente ?'])->assertStatus(404);
    }

    private function callProtected(object $object, string $method, array $args = []): mixed
    {
        $reflection = new \ReflectionMethod($object, $method);

        return $reflection->invokeArgs($object, $args);
    }
}
