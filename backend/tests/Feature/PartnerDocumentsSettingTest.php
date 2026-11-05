<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Services\HostProfileCompletion;
use App\Services\PartnerDocuments;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Décision bosejour du 2026-11-05 : les documents de conformité des partenaires deviennent FACULTATIFS pour le moment
 * (ils bloquaient beaucoup de partenaires) ; le super administrateur peut les rendre obligatoires « au moment venu ».
 */
class PartnerDocumentsSettingTest extends TestCase
{
    use RefreshDatabase;

    private const ESTABLISHMENT = [
        'name' => 'Résidence Test', 'type' => 'hotel', 'description' => 'Un bel établissement pour les tests.',
        'address' => 'Rue test', 'city' => 'Abidjan', 'latitude' => 5.3364, 'longitude' => -4.0267,
        'price_per_night' => 25000, 'max_guests' => 4, 'bedrooms' => 2, 'bathrooms' => 1,
    ];

    private function superAdmin(): User
    {
        $user = User::factory()->create(['role' => 'admin']);
        $role = Role::where('name', 'super_admin')->first() ?? Role::create(['name' => 'super_admin', 'display_name' => 'Super administrateur']);
        $user->roles()->attach($role->id);

        return $user;
    }

    /** Un partenaire dont les informations de contact sont complètes, sans AUCUN document, ni validation. */
    private function contactOnlyHost(array $overrides = []): User
    {
        return User::factory()->create($overrides + [
            'role' => 'host', 'phone' => '0701020304', 'date_of_birth' => '1985-04-12', 'bio' => 'Hôtelier à Korhogo.',
            'address_line1' => 'Quartier Résidentiel', 'city' => 'Korhogo', 'country' => 'Côte d\'Ivoire',
            'phone_fixed' => '2722000000', 'whatsapp' => '0701020304',
            'profile_completed' => false, 'profile_verified' => false,
        ]);
    }

    // --- Le réglage ---------------------------------------------------------------------------------------------

    public function test_documents_are_optional_until_the_super_admin_says_otherwise(): void
    {
        $this->assertFalse(PartnerDocuments::required(), 'facultatifs par défaut');
        $this->assertFalse($this->getJson('/api/settings/public')->assertOk()->json('partner_documents_required'));
    }

    public function test_only_the_super_admin_can_change_it_and_every_admin_can_read_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/settings/partner-documents')->assertOk()->assertJsonPath('required', false)->assertJsonPath('can_change', false);
        $this->putJson('/api/settings/partner-documents', ['required' => true])->assertStatus(403);
        $this->assertFalse(PartnerDocuments::required());

        Sanctum::actingAs($this->superAdmin());
        $this->getJson('/api/settings/partner-documents')->assertJsonPath('can_change', true);
        $this->putJson('/api/settings/partner-documents', ['required' => true])->assertOk()->assertJsonPath('required', true);
        $this->assertTrue(PartnerDocuments::required());
        $this->assertTrue($this->getJson('/api/settings/public')->json('partner_documents_required'));
        $this->assertNotNull($this->getJson('/api/settings/partner-documents')->json('last_change'), 'qui l\'a changé, et quand');

        $this->putJson('/api/settings/partner-documents', ['required' => false])->assertOk()->assertJsonPath('required', false);
        $this->putJson('/api/settings/partner-documents', ['required' => 'peut-être'])->assertStatus(422);
    }

    public function test_travelers_and_partners_cannot_read_or_change_it(): void
    {
        foreach (['user', 'host'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->getJson('/api/settings/partner-documents')->assertStatus(403);
            $this->putJson('/api/settings/partner-documents', ['required' => true])->assertStatus(403);
        }
    }

    public function test_the_super_admin_sees_how_many_partners_would_be_affected(): void
    {
        $this->contactOnlyHost();   // non conforme : aucun document
        $this->contactOnlyHost();
        Sanctum::actingAs($this->superAdmin());

        $response = $this->getJson('/api/settings/partner-documents')->assertOk();

        $this->assertSame(2, $response->json('partners_total'));
        $this->assertSame(2, $response->json('partners_non_compliant'));
    }

    // --- Ajouter un établissement -------------------------------------------------------------------------------

    public function test_with_optional_documents_a_partner_adds_an_establishment_without_documents_or_validation(): void
    {
        Sanctum::actingAs($this->contactOnlyHost());

        $this->postJson('/api/accommodations', self::ESTABLISHMENT)->assertCreated();
    }

    public function test_with_optional_documents_contact_details_are_still_needed(): void
    {
        Sanctum::actingAs($this->contactOnlyHost(['bio' => null, 'whatsapp' => null]));

        $this->postJson('/api/accommodations', self::ESTABLISHMENT)
            ->assertStatus(403)
            ->assertJsonPath('profile_completion_required', true);
    }

    public function test_once_made_mandatory_the_old_rules_apply_again(): void
    {
        PartnerDocuments::setRequired(true, User::factory()->create());
        $host = $this->contactOnlyHost();
        Sanctum::actingAs($host);

        $this->postJson('/api/accommodations', self::ESTABLISHMENT)
            ->assertStatus(403)
            ->assertJsonPath('profile_completion_required', true);

        $host->forceFill(['profile_completed' => true])->save();
        $this->postJson('/api/accommodations', self::ESTABLISHMENT)
            ->assertStatus(403)
            ->assertJsonPath('profile_verification_required', true);

        $host->forceFill(['profile_verified' => true])->save();
        $this->postJson('/api/accommodations', self::ESTABLISHMENT)->assertCreated();
    }

    public function test_a_partner_already_complete_and_verified_is_never_blocked_by_the_relaxed_rules(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'host', 'profile_completed' => true, 'profile_verified' => true]));

        $this->postJson('/api/accommodations', self::ESTABLISHMENT)->assertCreated();
    }

    // --- Pourcentage de complétion ------------------------------------------------------------------------------

    public function test_the_profile_reaches_100_percent_without_documents_while_they_are_optional(): void
    {
        $host = $this->contactOnlyHost();
        Sanctum::actingAs($host);

        $this->assertSame(100, HostProfileCompletion::percentage($host, false));
        $this->assertLessThan(100, HostProfileCompletion::percentage($host, true), 'avec documents obligatoires, il manque les pièces');

        $this->getJson('/api/host/profile')->assertOk()
            ->assertJsonPath('completion_percentage', 100)
            ->assertJsonPath('is_complete', true)
            ->assertJsonPath('documents_required', false);

        PartnerDocuments::setRequired(true, User::factory()->create());
        $this->getJson('/api/host/profile')->assertOk()
            ->assertJsonPath('documents_required', true)
            ->assertJson(fn ($json) => $json->where('is_complete', false)->etc());
    }

    public function test_saving_the_profile_while_optional_does_not_mark_it_complete_in_the_strict_sense(): void
    {
        $host = $this->contactOnlyHost();
        Sanctum::actingAs($host);

        $this->post('/api/host/profile', ['bio' => 'Hôtelier à Korhogo, depuis 2010.'], ['Accept' => 'application/json'])->assertOk()
            ->assertJsonPath('is_complete', true);

        $this->assertFalse((bool) $host->fresh()->profile_completed, 'le drapeau garde le sens « documents compris » : il ne devient pas vrai sans documents');
    }

    // --- Relances ---------------------------------------------------------------------------------------------------

    public function test_no_compliance_reminder_is_sent_while_documents_are_optional(): void
    {
        $host = $this->contactOnlyHost(['created_at' => now()->subDays(100), 'last_login_at' => now()->subDays(40), 'compliance_reminder_stage' => 0]);

        $this->artisan('compliance:remind-hosts')->expectsOutputToContain('facultatifs')->assertSuccessful();

        $this->assertSame(0, $host->fresh()->compliance_reminder_stage, 'aucune relance, aucun changement d\'étape');
    }

    public function test_reminders_run_again_once_documents_are_mandatory(): void
    {
        PartnerDocuments::setRequired(true, User::factory()->create());
        $this->contactOnlyHost(['created_at' => now()->subDays(100)]);

        $this->artisan('compliance:remind-hosts')->doesntExpectOutputToContain('facultatifs')->assertSuccessful();
    }
}
