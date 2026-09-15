<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : "assure toi aussi que chaque hote fourni un
 * numéro whatsapp joignable et un mail valide egalement" — le WhatsApp de
 * l'établissement est déjà requis à l'inscription (AuthController), mais la
 * mise à jour du profil (HostProfileController::update()) acceptait jusqu'ici
 * de le vider silencieusement (règle nullable) : un hôte pouvait donc, après
 * coup, se retrouver sans aucun moyen de contact WhatsApp.
 */
class HostProfileWhatsappTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_cannot_clear_their_whatsapp_number_via_profile_update(): void
    {
        $host = User::factory()->create(['role' => 'host', 'whatsapp' => '+2250700000000']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile', ['whatsapp' => ''])->assertStatus(422);

        $this->assertSame('+2250700000000', $host->fresh()->whatsapp);
    }

    public function test_host_can_update_their_whatsapp_number_to_a_valid_value(): void
    {
        $host = User::factory()->create(['role' => 'host', 'whatsapp' => '+2250700000000']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile', ['whatsapp' => '+2250701020304'])->assertOk();

        $this->assertSame('+2250701020304', $host->fresh()->whatsapp);
    }

    public function test_updating_an_unrelated_field_does_not_require_whatsapp(): void
    {
        $host = User::factory()->create(['role' => 'host', 'whatsapp' => '+2250700000000', 'bio' => 'Ancienne bio']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile', ['bio' => 'Nouvelle bio'])->assertOk();

        $host->refresh();
        $this->assertSame('Nouvelle bio', $host->bio);
        $this->assertSame('+2250700000000', $host->whatsapp);
    }

    public function test_whatsapp_with_invalid_characters_is_rejected(): void
    {
        $host = User::factory()->create(['role' => 'host', 'whatsapp' => '+2250700000000']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile', ['whatsapp' => 'pas-un-numero!!'])->assertStatus(422);

        $this->assertSame('+2250700000000', $host->fresh()->whatsapp);
    }

    public function test_compliance_requirements_include_a_valid_email_check(): void
    {
        $host = User::factory()->create(['role' => 'host', 'email' => 'contact@hotel-baobab.ci']);

        $requirements = $host->compliance_requirements;

        $this->assertArrayHasKey('valid_email', $requirements);
        $this->assertTrue($requirements['valid_email']['ok']);
    }
}
