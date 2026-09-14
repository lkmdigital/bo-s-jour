<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Message;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Demande utilisateur 2026-09-13 : "vérifie que l'admin approuve bien la
 * demande d'un établissement avant que celui-ci puisse intégrer la
 * plateforme". Distinct de la validation du COMPTE hôte (profile_verified,
 * AdminHostController) — ici c'est l'ÉTABLISSEMENT lui-même
 * (accommodations.status) qui doit rester invisible du public tant qu'un
 * admin ne l'a pas approuvé, quel que soit l'état du compte hôte.
 */
class AccommodationApprovalGateTest extends TestCase
{
    use RefreshDatabase;

    private function makeHost(): User
    {
        return User::factory()->create(['role' => 'host', 'profile_completed' => true, 'profile_verified' => true]);
    }

    public function test_a_newly_created_accommodation_defaults_to_pending(): void
    {
        $host = $this->makeHost();
        Sanctum::actingAs($host);

        $response = $this->postJson('/api/accommodations', [
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
        ])->assertCreated();

        $this->assertSame('pending', $response->json('status'));
    }

    public function test_a_pending_accommodation_is_invisible_in_public_listing_and_detail(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Room::create([
            'accommodation_id' => $accommodation->id, 'name' => 'Standard', 'type' => 'double',
            'capacity' => 2, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 1,
        ]);

        // Invisible dans la liste publique.
        $listIds = collect($this->getJson('/api/accommodations?per_page=100')->json('data'))->pluck('id');
        $this->assertNotContains($accommodation->id, $listIds);

        // Invisible sur sa propre fiche publique (404, pas de fuite d'info).
        $this->getJson("/api/accommodations/{$accommodation->id}")->assertNotFound();

        // Invisible dans "villes en avant" et "établissements similaires".
        $cities = collect($this->getJson('/api/top-cities')->json());
        $this->assertSame(0, (int) ($cities->firstWhere('city', $accommodation->city)['accommodations_count'] ?? 0));
    }

    public function test_a_published_accommodation_is_visible_publicly(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published']);
        Room::create([
            'accommodation_id' => $accommodation->id, 'name' => 'Standard', 'type' => 'double',
            'capacity' => 2, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 1,
        ]);

        $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();
        $listIds = collect($this->getJson('/api/accommodations?per_page=100')->json('data'))->pluck('id');
        $this->assertContains($accommodation->id, $listIds);
    }

    public function test_a_host_cannot_self_publish_their_own_accommodation(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['status' => 'published'])
            ->assertStatus(403);

        $this->assertSame('pending', $accommodation->fresh()->status);
    }

    public function test_a_host_cannot_self_approve_a_rejected_accommodation(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'rejected']);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['status' => 'published'])
            ->assertStatus(403);

        $this->assertSame('rejected', $accommodation->fresh()->status);
    }

    public function test_admin_can_approve_a_pending_accommodation_making_it_publicly_visible(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Room::create([
            'accommodation_id' => $accommodation->id, 'name' => 'Standard', 'type' => 'double',
            'capacity' => 2, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 1,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson("/api/admin/accommodations/{$accommodation->id}/approve", [])->assertOk();

        $this->assertSame('published', $accommodation->fresh()->status);
        $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();
    }

    public function test_admin_can_reject_a_pending_accommodation_keeping_it_hidden(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson("/api/admin/accommodations/{$accommodation->id}/reject", ['reason' => 'Documents manquants'])
            ->assertOk();

        $this->assertSame('rejected', $accommodation->fresh()->status);

        // Vue publique (non authentifiée) : un admin/propriétaire connecté verrait
        // quand même sa propre fiche pending/rejected (aperçu légitime) — on efface
        // donc l'utilisateur "acting as" pour vérifier ce qu'un vrai visiteur voit.
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/accommodations/{$accommodation->id}")->assertNotFound();
    }

    public function test_approving_an_accommodation_notifies_the_host_in_app(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson("/api/admin/accommodations/{$accommodation->id}/approve", [])->assertOk();

        $message = Message::where('recipient_id', $host->id)->where('subject', 'Établissement approuvé')->first();
        $this->assertNotNull($message, "l'hôte doit être notifié dans son Extranet quand son établissement est approuvé");
    }

    public function test_rejecting_an_accommodation_notifies_the_host_with_the_reason(): void
    {
        $host = $this->makeHost();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson("/api/admin/accommodations/{$accommodation->id}/reject", ['reason' => 'Photos manquantes'])
            ->assertOk();

        $message = Message::where('recipient_id', $host->id)->where('subject', 'Établissement non approuvé')->first();
        $this->assertNotNull($message);
        $this->assertStringContainsString('Photos manquantes', $message->body);
    }
}
