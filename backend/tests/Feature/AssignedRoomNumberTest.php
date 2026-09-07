<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.2/4.10) : "numéro de chambre, LORSQU'IL
 * EST ATTRIBUÉ" — champ opérationnel facultatif, l'hôte/l'admin l'attribue
 * librement (souvent à l'arrivée). Volontairement pas un inventaire de
 * chambres individuelles (refonte du modèle de données hors périmètre).
 */
class AssignedRoomNumberTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_can_assign_a_room_number_to_their_own_booking(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id]);
        $booking = Booking::factory()->create(['accommodation_id' => $accommodation->id]);

        Sanctum::actingAs($host);
        $this->putJson("/api/bookings/{$booking->id}", ['assigned_room_number' => '204'])
            ->assertOk()
            ->assertJsonPath('assigned_room_number', '204');

        $this->assertSame('204', $booking->fresh()->assigned_room_number);
    }

    public function test_admin_can_assign_a_room_number(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $booking = Booking::factory()->create();

        Sanctum::actingAs($admin);
        $this->putJson("/api/bookings/{$booking->id}", ['assigned_room_number' => 'A12'])->assertOk();

        $this->assertSame('A12', $booking->fresh()->assigned_room_number);
    }

    public function test_traveler_cannot_assign_a_room_number_to_their_own_booking(): void
    {
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create();

        Sanctum::actingAs($traveler);
        $this->putJson("/api/bookings/{$booking->id}", ['assigned_room_number' => '204'])
            ->assertStatus(403);

        $this->assertNull($booking->fresh()->assigned_room_number);
    }

    public function test_room_number_can_be_cleared_by_sending_an_empty_value(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id]);
        $booking = Booking::factory()->create([
            'accommodation_id' => $accommodation->id,
            'assigned_room_number' => '101',
        ]);

        Sanctum::actingAs($host);
        $this->putJson("/api/bookings/{$booking->id}", ['assigned_room_number' => ''])->assertOk();

        $this->assertNull($booking->fresh()->assigned_room_number);
    }
}
