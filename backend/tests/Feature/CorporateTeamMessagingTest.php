<?php

namespace Tests\Feature;

use App\Models\CorporateCollaborator;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : "mtn les membres ont la possibilité d'envoyer
 * des messages à d'autres membre" — confirmé (AskUserQuestion) : limité aux
 * membres d'un même Compte Entreprise (responsable ↔ collaborateur, et
 * collaborateurs entre eux), faute d'annuaire de membres dans l'app.
 */
class CorporateTeamMessagingTest extends TestCase
{
    use RefreshDatabase;

    private function makeActiveCollaborator(User $owner, ?User $user = null): User
    {
        $user = $user ?? User::factory()->create();
        CorporateCollaborator::factory()->for($owner, 'owner')->create([
            'collaborator_user_id' => $user->id,
            'status' => CorporateCollaborator::STATUS_ACTIVE,
        ]);
        return $user;
    }

    public function test_owner_can_message_an_active_collaborator(): void
    {
        $owner = User::factory()->corporate()->create();
        $collaborator = $this->makeActiveCollaborator($owner);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/me/corporate/message', [
            'recipient_id' => $collaborator->id,
            'body' => 'Merci de réserver pour la mission de lundi.',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'sender_id' => $owner->id,
            'recipient_id' => $collaborator->id,
            'body' => 'Merci de réserver pour la mission de lundi.',
        ]);
        $this->assertSame($collaborator->id, $response->json('recipient.id'));
    }

    public function test_collaborator_can_message_the_owner(): void
    {
        $owner = User::factory()->corporate()->create();
        $collaborator = $this->makeActiveCollaborator($owner);
        Sanctum::actingAs($collaborator);

        $this->postJson('/api/me/corporate/message', [
            'recipient_id' => $owner->id,
            'body' => 'Question sur mon plafond de dépenses.',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'sender_id' => $collaborator->id,
            'recipient_id' => $owner->id,
        ]);
    }

    public function test_two_collaborators_of_the_same_owner_can_message_each_other(): void
    {
        $owner = User::factory()->corporate()->create();
        $alice = $this->makeActiveCollaborator($owner);
        $bob = $this->makeActiveCollaborator($owner);
        Sanctum::actingAs($alice);

        $this->postJson('/api/me/corporate/message', [
            'recipient_id' => $bob->id,
            'body' => 'On partage le taxi pour l\'hôtel ?',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', ['sender_id' => $alice->id, 'recipient_id' => $bob->id]);
    }

    public function test_a_stranger_cannot_message_a_collaborator(): void
    {
        $owner = User::factory()->corporate()->create();
        $collaborator = $this->makeActiveCollaborator($owner);
        $stranger = User::factory()->create();
        Sanctum::actingAs($stranger);

        $this->postJson('/api/me/corporate/message', [
            'recipient_id' => $collaborator->id,
            'body' => 'Bonjour !',
        ])->assertStatus(403);

        $this->assertDatabaseMissing('messages', ['sender_id' => $stranger->id, 'recipient_id' => $collaborator->id]);
    }

    public function test_owner_cannot_message_a_suspended_collaborator(): void
    {
        $owner = User::factory()->corporate()->create();
        $suspended = User::factory()->create();
        CorporateCollaborator::factory()->for($owner, 'owner')->create([
            'collaborator_user_id' => $suspended->id,
            'status' => CorporateCollaborator::STATUS_SUSPENDED,
        ]);
        Sanctum::actingAs($owner);

        $this->postJson('/api/me/corporate/message', [
            'recipient_id' => $suspended->id,
            'body' => 'Bonjour !',
        ])->assertStatus(403);
    }

    public function test_collaborator_sees_owner_id_and_active_siblings_but_not_themselves(): void
    {
        $owner = User::factory()->corporate()->create();
        $self = $this->makeActiveCollaborator($owner);
        $sibling = $this->makeActiveCollaborator($owner);
        $invitedOnly = User::factory()->create();
        CorporateCollaborator::factory()->for($owner, 'owner')->create([
            'collaborator_user_id' => $invitedOnly->id,
            'status' => CorporateCollaborator::STATUS_INVITED,
        ]);
        Sanctum::actingAs($self);

        $response = $this->getJson('/api/me/corporate/overview')->assertOk();

        $this->assertSame($owner->id, $response->json('owner_id'));
        $siblingIds = collect($response->json('collaborators'))->pluck('collaborator_user_id');
        $this->assertTrue($siblingIds->contains($sibling->id));
        $this->assertFalse($siblingIds->contains($self->id));
        $this->assertFalse($siblingIds->contains($invitedOnly->id));
    }

    public function test_owner_overview_still_sees_every_collaborator_regardless_of_status(): void
    {
        $owner = User::factory()->corporate()->create();
        $active = $this->makeActiveCollaborator($owner);
        $invited = User::factory()->create();
        CorporateCollaborator::factory()->for($owner, 'owner')->create([
            'collaborator_user_id' => $invited->id,
            'status' => CorporateCollaborator::STATUS_INVITED,
        ]);
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/me/corporate/overview')->assertOk();

        $this->assertSame($owner->id, $response->json('owner_id'));
        $ids = collect($response->json('collaborators'))->pluck('collaborator_user_id');
        $this->assertTrue($ids->contains($active->id));
        $this->assertTrue($ids->contains($invited->id));
    }

    public function test_traveler_can_reply_from_their_inbox_to_a_message_they_received(): void
    {
        $owner = User::factory()->corporate()->create();
        $collaborator = $this->makeActiveCollaborator($owner);

        $original = Message::create([
            'recipient_id' => $collaborator->id,
            'sender_id' => $owner->id,
            'is_from_platform' => false,
            'subject' => 'Message de ' . $owner->name,
            'body' => 'Bonjour, tu es dispo ?',
        ]);

        Sanctum::actingAs($collaborator);
        $this->postJson('/api/user/inbox', [
            'parent_id' => $original->id,
            'body' => 'Oui, je suis dispo.',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'parent_id' => $original->id,
            'sender_id' => $collaborator->id,
            'recipient_id' => $owner->id,
        ]);
    }
}
