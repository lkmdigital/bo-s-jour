<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : "à quel moment un hote peut ajouter un de ses
 * etablissement au programme de fidelisation ?" puis "rends cette option
 * disponible aussi dans le formulaire de création" — la participation
 * (loyalty_program_joined_at) n'était proposable que sur la fiche d'édition
 * (AccommodationController::update()) ; rendue disponible dès la création
 * (AccommodationController::store()), avec la même sémantique d'horodatage.
 */
class AccommodationLoyaltyProgramTest extends TestCase
{
    use RefreshDatabase;

    private function makeHost(): User
    {
        return User::factory()->create(['role' => 'host', 'profile_completed' => true, 'profile_verified' => true]);
    }

    private function creationPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Résidence Test',
            'type' => 'hotel',
            'description' => 'Un bel établissement pour les tests.',
            'address' => 'Rue test',
            'city' => 'Abidjan',
            'latitude' => 5.3364,
            'longitude' => -4.0267,
            'price_per_night' => 25000,
            'max_guests' => 4,
            'bedrooms' => 2,
            'bathrooms' => 1,
        ], $overrides);
    }

    public function test_a_host_can_join_the_loyalty_program_at_creation(): void
    {
        Sanctum::actingAs($this->makeHost());

        $response = $this->postJson('/api/accommodations', $this->creationPayload([
            'loyalty_program_joined' => true,
        ]))->assertCreated();

        $accommodation = Accommodation::findOrFail($response->json('id'));
        $this->assertNotNull($accommodation->loyalty_program_joined_at);
    }

    public function test_an_accommodation_does_not_join_the_loyalty_program_by_default(): void
    {
        Sanctum::actingAs($this->makeHost());

        $response = $this->postJson('/api/accommodations', $this->creationPayload())->assertCreated();

        $accommodation = Accommodation::findOrFail($response->json('id'));
        $this->assertNull($accommodation->loyalty_program_joined_at);
    }

    public function test_a_host_can_join_the_loyalty_program_afterwards_via_update(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'loyalty_program_joined_at' => null]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['loyalty_program_joined' => true])->assertOk();

        $this->assertNotNull($accommodation->fresh()->loyalty_program_joined_at);
    }

    public function test_a_host_can_leave_the_loyalty_program_via_update(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->loyaltyParticipant()->create(['host_id' => $host->id]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['loyalty_program_joined' => false])->assertOk();

        $this->assertNull($accommodation->fresh()->loyalty_program_joined_at);
    }

    public function test_updating_an_already_joined_accommodation_does_not_reset_the_join_date(): void
    {
        $host = $this->makeHost();
        $joinedAt = now()->subMonths(2);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'loyalty_program_joined_at' => $joinedAt]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['loyalty_program_joined' => true])->assertOk();

        $this->assertSame($joinedAt->toDateTimeString(), $accommodation->fresh()->loyalty_program_joined_at->toDateTimeString());
    }
}
