<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.5) : "Pendant le paiement, la chambre
 * doit être verrouillée temporairement afin d'éviter une double vente...
 * En cas d'échec, d'annulation ou d'expiration, le verrouillage est libéré."
 *
 * Bug réel trouvé en creusant : BookingStatus::occupying() (le filtre utilisé
 * par le contrôle de disponibilité à la création) ne comptait que les
 * réservations "confirmed" — une réservation "pending" en attente de
 * paiement (donc en cours de passerelle Malia Pay) ne bloquait PAS la
 * chambre pour un autre voyageur. Deux personnes pouvaient payer en même
 * temps pour la même chambre.
 */
class RoomAvailabilityLockTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(int $quantity = 1): Room
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);
        return Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => $quantity,
        ]);
    }

    private function bookingPayload(Room $room): array
    {
        return [
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 1,
            'residence_country' => "Côte d'Ivoire",
        ];
    }

    public function test_a_pending_unpaid_booking_blocks_the_room_for_another_traveler(): void
    {
        $room = $this->makeRoom();
        $firstTraveler = User::factory()->create();
        Sanctum::actingAs($firstTraveler);

        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        $secondTraveler = User::factory()->create();
        Sanctum::actingAs($secondTraveler);

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room));

        $response->assertStatus(409);
        $this->assertSame(1, Booking::where('room_id', $room->id)->count(), 'la deuxième réservation ne doit pas avoir été créée');
    }

    public function test_an_expired_pending_booking_no_longer_blocks_the_room(): void
    {
        $room = $this->makeRoom();
        $firstTraveler = User::factory()->create();
        Booking::factory()->for($firstTraveler)->create([
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'status' => 'pending',
            'expires_at' => now()->subMinute(), // fenêtre de hold expirée
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12),
        ]);

        $secondTraveler = User::factory()->create();
        Sanctum::actingAs($secondTraveler);

        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();
    }

    public function test_a_cancelled_booking_does_not_block_the_room(): void
    {
        $room = $this->makeRoom();
        $firstTraveler = User::factory()->create();
        Booking::factory()->for($firstTraveler)->create([
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'status' => 'cancelled',
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12),
        ]);

        $secondTraveler = User::factory()->create();
        Sanctum::actingAs($secondTraveler);

        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();
    }

    public function test_non_overlapping_dates_are_not_blocked_by_a_pending_booking(): void
    {
        $room = $this->makeRoom();
        $firstTraveler = User::factory()->create();
        Sanctum::actingAs($firstTraveler);
        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        $secondTraveler = User::factory()->create();
        Sanctum::actingAs($secondTraveler);

        $payload = $this->bookingPayload($room);
        $payload['check_in'] = now()->addDays(20)->toDateString();
        $payload['check_out'] = now()->addDays(22)->toDateString();

        $this->postJson('/api/bookings', $payload)->assertCreated();
    }
}
