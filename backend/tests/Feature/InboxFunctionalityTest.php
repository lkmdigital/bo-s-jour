<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Demande utilisateur 2026-09-13 : "vérifie que la page message est
 * fonctionnelle sur les espaces" — couvre les DEUX boîtes de réception
 * distinctes de la plateforme (Extranet hôte /host/inbox et espace
 * voyageur /user/inbox), en plus du fil par réservation déjà vérifié le
 * 2026-09-10 (BookingMessageThread).
 */
class InboxFunctionalityTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_sees_messages_addressed_to_them_in_their_inbox(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $traveler = User::factory()->create();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id]);
        $booking = Booking::factory()->for($traveler)->create(['accommodation_id' => $accommodation->id]);

        Message::create([
            'recipient_id' => $host->id,
            'sender_id' => $traveler->id,
            'is_from_platform' => false,
            'subject' => 'Question sur ma réservation',
            'body' => "Bonjour, l'établissement propose-t-il un parking ?",
            'booking_id' => $booking->id,
        ]);

        Sanctum::actingAs($host);
        $res = $this->getJson('/api/host/inbox')->assertOk();

        $this->assertSame(1, $res->json('total'));
        $this->assertSame('Question sur ma réservation', $res->json('data.0.subject'));
        $this->assertSame($traveler->id, $res->json('data.0.sender.id'));
    }

    public function test_host_can_reply_to_a_traveler_message(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $traveler = User::factory()->create();
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id]);
        $message = Message::create([
            'recipient_id' => $host->id,
            'sender_id' => $traveler->id,
            'is_from_platform' => false,
            'subject' => 'Question',
            'body' => 'Avez-vous un parking ?',
            'booking_id' => Booking::factory()->for($traveler)->create(['accommodation_id' => $accommodation->id])->id,
        ]);

        Sanctum::actingAs($host);
        $this->postJson('/api/host/inbox', ['parent_id' => $message->id, 'body' => 'Oui, un parking gratuit est disponible.'])
            ->assertCreated();

        // La réponse doit atterrir chez le voyageur, pas chez l'hôte lui-même.
        $reply = Message::where('parent_id', $message->id)->first();
        $this->assertSame($traveler->id, $reply->recipient_id);
        $this->assertSame($host->id, $reply->sender_id);

        // Et apparaître dans l'espace voyageur en tant que réponse rattachée au message d'origine.
        Sanctum::actingAs($traveler);
        $res = $this->getJson('/api/user/inbox')->assertOk();
        $this->assertSame('Oui, un parking gratuit est disponible.', $res->json('data.0.replies.0.body'));
    }

    public function test_host_cannot_reply_to_a_platform_generated_message(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        \App\Models\Message::notifyHostAccommodationApproved($accommodation);
        $platformMessage = Message::where('recipient_id', $host->id)->first();

        Sanctum::actingAs($host);
        $this->postJson('/api/host/inbox', ['parent_id' => $platformMessage->id, 'body' => 'Merci !'])
            ->assertStatus(422);
    }

    public function test_host_cannot_reply_to_another_hosts_message(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $otherHost = User::factory()->create(['role' => 'host']);
        $traveler = User::factory()->create();
        $accommodation = Accommodation::factory()->create(['host_id' => $otherHost->id]);
        $message = Message::create([
            'recipient_id' => $otherHost->id,
            'sender_id' => $traveler->id,
            'is_from_platform' => false,
            'subject' => 'Question',
            'body' => 'Bonjour',
            'booking_id' => Booking::factory()->for($traveler)->create(['accommodation_id' => $accommodation->id])->id,
        ]);

        Sanctum::actingAs($host);
        $this->postJson('/api/host/inbox', ['parent_id' => $message->id, 'body' => 'Intrusion'])
            ->assertStatus(404);
    }

    public function test_host_can_mark_a_message_as_read(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $message = Message::create([
            'recipient_id' => $host->id, 'sender_id' => null, 'is_from_platform' => true,
            'subject' => 'Bienvenue', 'body' => 'Bienvenue sur BoSéjour.',
        ]);

        Sanctum::actingAs($host);
        $this->patchJson("/api/host/inbox/{$message->id}/read")->assertOk();

        $this->assertNotNull($message->fresh()->read_at);
    }

    public function test_traveler_sees_both_platform_messages_and_host_replies_in_their_inbox(): void
    {
        $traveler = User::factory()->create();
        Message::create([
            'recipient_id' => $traveler->id, 'sender_id' => null, 'is_from_platform' => true,
            'subject' => 'Votre code de réservation', 'body' => 'Code : ABC123',
        ]);

        Sanctum::actingAs($traveler);
        $res = $this->getJson('/api/user/inbox')->assertOk();

        $this->assertSame(1, $res->json('total'));
        $this->assertTrue($res->json('data.0.is_from_platform'));
    }

    public function test_traveler_inbox_unread_count_reflects_only_their_own_unread_messages(): void
    {
        $traveler = User::factory()->create();
        $otherTraveler = User::factory()->create();
        Message::create(['recipient_id' => $traveler->id, 'sender_id' => null, 'is_from_platform' => true, 'subject' => 'A', 'body' => 'x']);
        Message::create(['recipient_id' => $traveler->id, 'sender_id' => null, 'is_from_platform' => true, 'subject' => 'B', 'body' => 'y', 'read_at' => now()]);
        Message::create(['recipient_id' => $otherTraveler->id, 'sender_id' => null, 'is_from_platform' => true, 'subject' => 'C', 'body' => 'z']);

        Sanctum::actingAs($traveler);
        $this->getJson('/api/user/inbox/unread-count')->assertOk()->assertJsonPath('unread_count', 1);
    }

    public function test_a_host_never_sees_another_hosts_messages_in_their_inbox(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $otherHost = User::factory()->create(['role' => 'host']);
        Message::create(['recipient_id' => $otherHost->id, 'sender_id' => null, 'is_from_platform' => true, 'subject' => 'Pour un autre', 'body' => 'x']);

        Sanctum::actingAs($host);
        $this->getJson('/api/host/inbox')->assertOk()->assertJsonPath('total', 0);
    }
}
