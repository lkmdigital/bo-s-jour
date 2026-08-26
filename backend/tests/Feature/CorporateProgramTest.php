<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\CorporateCollaborator;
use App\Models\User;
use App\Services\CorporateLoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Simule une entreprise et ses collaborateurs traversant le Programme
 * Corporate (doc client §9-13) : invitation d'un collaborateur avec
 * département, rapport de dépenses ventilé, gel de la récompense annuelle
 * selon le CA réalisé.
 */
class CorporateProgramTest extends TestCase
{
    use RefreshDatabase;

    public function test_corporate_owner_can_invite_and_edit_a_collaborators_department(): void
    {
        $owner = User::factory()->corporate()->create();
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/me/corporate/collaborators', [
            'email' => 'collab@example.com',
            'name' => 'Awa Koné',
            'department' => 'Commercial',
            'spending_limit' => 200000,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('corporate_collaborators', [
            'owner_id' => $owner->id,
            'email' => 'collab@example.com',
            'department' => 'Commercial',
        ]);

        $collaborator = CorporateCollaborator::where('owner_id', $owner->id)->firstOrFail();

        $this->putJson("/api/me/corporate/collaborators/{$collaborator->id}", [
            'department' => 'Comptabilité',
        ])->assertOk();

        $this->assertSame('Comptabilité', $collaborator->fresh()->department);
    }

    public function test_expenses_report_is_grouped_by_department(): void
    {
        $owner = User::factory()->corporate()->create();

        $commercial = User::factory()->create();
        CorporateCollaborator::factory()->for($owner, 'owner')->create([
            'collaborator_user_id' => $commercial->id,
            'department' => 'Commercial',
            'status' => CorporateCollaborator::STATUS_ACTIVE,
        ]);

        $compta = User::factory()->create();
        CorporateCollaborator::factory()->for($owner, 'owner')->create([
            'collaborator_user_id' => $compta->id,
            'department' => 'Comptabilité',
            'status' => CorporateCollaborator::STATUS_ACTIVE,
        ]);

        Booking::factory()->corporate()->for($commercial)->create(['total_price' => 100000]);
        Booking::factory()->corporate()->for($commercial)->create(['total_price' => 50000]);
        Booking::factory()->corporate()->for($compta)->create(['total_price' => 75000]);

        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/me/corporate/expenses');

        $response->assertOk();
        $byDepartment = collect($response->json('by_department'))->keyBy('department');

        // assertEquals (pas assertSame) : un float entier comme 150000.0
        // redevient un int après l'aller-retour JSON (json_encode ne
        // préserve pas ".0" par défaut).
        $this->assertEquals(150000, $byDepartment['Commercial']['total']);
        $this->assertSame(2, $byDepartment['Commercial']['count']);
        $this->assertEquals(75000, $byDepartment['Comptabilité']['total']);
    }

    public function test_annual_reward_is_frozen_at_the_tier_matching_realized_revenue(): void
    {
        $owner = User::factory()->corporate()->create();

        // 12 000 000 FCFA de CA réalisé en 2025 -> franchit le palier 10 M
        // (doc §12 : "Bon Corporate de 50 000 FCFA") mais pas le palier 25 M.
        Booking::factory()->corporate()->for($owner)->create([
            'total_price' => 12000000,
            'status' => 'confirmed',
            'check_in' => '2025-06-01',
            'check_out' => '2025-06-05',
        ]);

        // Hors période (2024) -> ne doit pas compter dans le CA 2025.
        Booking::factory()->corporate()->for($owner)->create([
            'total_price' => 50000000,
            'status' => 'confirmed',
            'check_in' => '2024-06-01',
            'check_out' => '2024-06-05',
        ]);

        $reward = app(CorporateLoyaltyService::class)->freezeYearReward($owner, 2025);

        $this->assertSame(2025, $reward->year);
        $this->assertEqualsWithDelta(12000000.0, (float) $reward->revenue_total, 0.01);
        $this->assertSame('Bon Corporate de 50 000 FCFA', $reward->reward_label);

        $this->assertDatabaseHas('corporate_annual_rewards', [
            'owner_id' => $owner->id,
            'year' => 2025,
        ]);
    }
}
