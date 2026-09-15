<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : "ajoute aussi la possibilité qu'un membre
 * écrive à un hote" — jusqu'ici un voyageur ne pouvait écrire à un hôte que
 * depuis le fil d'une réservation déjà créée (voir ExtraBreakfastTest et
 * consorts pour le flux de réservation) ; bouton "Contacter l'établissement"
 * sur la fiche hébergement, sans réservation préalable.
 */
class AccommodationContactHostTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_traveler_can_contact_the_host_of_a_published_accommodation(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published', 'name' => 'Lodge Baobab']);
        $traveler = User::factory()->create();
        Sanctum::actingAs($traveler);

        $response = $this->postJson("/api/accommodations/{$accommodation->id}/contact", [
            'body' => 'Bonjour, avez-vous une chambre familiale disponible en octobre ?',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'sender_id' => $traveler->id,
            'recipient_id' => $host->id,
            'body' => 'Bonjour, avez-vous une chambre familiale disponible en octobre ?',
        ]);
        $this->assertStringContainsString('Lodge Baobab', $response->json('subject'));
    }

    public function test_cannot_contact_the_host_of_a_pending_accommodation(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        $traveler = User::factory()->create();
        Sanctum::actingAs($traveler);

        $this->postJson("/api/accommodations/{$accommodation->id}/contact", [
            'body' => 'Bonjour !',
        ])->assertStatus(422);

        $this->assertDatabaseMissing('messages', ['sender_id' => $traveler->id, 'recipient_id' => $host->id]);
    }

    public function test_a_host_cannot_contact_themselves_about_their_own_establishment(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published']);
        Sanctum::actingAs($host);

        $this->postJson("/api/accommodations/{$accommodation->id}/contact", [
            'body' => 'Test',
        ])->assertStatus(403);
    }

    public function test_host_receives_the_message_in_their_inbox_and_can_reply(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published']);
        $traveler = User::factory()->create();
        Sanctum::actingAs($traveler);

        $this->postJson("/api/accommodations/{$accommodation->id}/contact", [
            'body' => 'Avez-vous un parking ?',
        ])->assertCreated();

        Sanctum::actingAs($host);
        $inbox = $this->getJson('/api/host/inbox')->assertOk();
        $threadId = collect($inbox->json('data'))->firstWhere('body', 'Avez-vous un parking ?')['id'];

        $this->postJson('/api/host/inbox', [
            'parent_id' => $threadId,
            'body' => 'Oui, parking gratuit sur place.',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'parent_id' => $threadId,
            'sender_id' => $host->id,
            'recipient_id' => $traveler->id,
        ]);
    }

    /**
     * Bug trouvé en vérification manuelle : le voyageur qui a démarré le fil
     * (donc expéditeur, pas destinataire, du message racine) ne pouvait pas
     * répondre à la réponse de l'hôte — UserInboxController::reply()
     * exigeait à tort d'être le destinataire du message ciblé. De plus, une
     * réponse en chaîne (parent_id pointant vers la dernière réponse plutôt
     * que vers la racine) sortait de la liste affichée par /user/inbox,
     * qui ne charge que replies() de la racine (un seul niveau). Corrigé :
     * toute réponse s'accroche à la racine, avec un destinataire déterminé
     * en inversant les rôles de celle-ci.
     */
    public function test_traveler_who_started_the_thread_can_reply_to_the_hosts_answer(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published']);
        $traveler = User::factory()->create();

        Sanctum::actingAs($traveler);
        $root = $this->postJson("/api/accommodations/{$accommodation->id}/contact", [
            'body' => 'Avez-vous un parking ?',
        ])->assertCreated()->json();

        Sanctum::actingAs($host);
        $this->postJson('/api/host/inbox', [
            'parent_id' => $root['id'],
            'body' => 'Oui, parking gratuit sur place.',
        ])->assertCreated();

        Sanctum::actingAs($traveler);
        $this->postJson('/api/user/inbox', [
            'parent_id' => $root['id'],
            'body' => 'Parfait, merci !',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'parent_id' => $root['id'],
            'sender_id' => $traveler->id,
            'recipient_id' => $host->id,
            'body' => 'Parfait, merci !',
        ]);

        // La réponse reste un enfant direct de la racine (pas de la réponse
        // de l'hôte) pour que /user/inbox l'affiche bien dans le même fil.
        $inbox = $this->getJson('/api/user/inbox')->assertOk();
        $thread = collect($inbox->json('data'))->firstWhere('id', $root['id']);
        $this->assertCount(2, $thread['replies']);
    }

    public function test_a_stranger_cannot_reply_into_someone_elses_thread(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published']);
        $traveler = User::factory()->create();
        $stranger = User::factory()->create();

        Sanctum::actingAs($traveler);
        $root = $this->postJson("/api/accommodations/{$accommodation->id}/contact", [
            'body' => 'Avez-vous un parking ?',
        ])->assertCreated()->json();

        Sanctum::actingAs($stranger);
        $this->postJson('/api/user/inbox', [
            'parent_id' => $root['id'],
            'body' => 'Je peux répondre à ta place !',
        ])->assertStatus(403);
    }
}
