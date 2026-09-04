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
 * Retour client 2026-09-02 (Partie 4.3) : "heure d'arrivée prévisionnelle"
 * demandée dans le détail de réservation — champ facultatif ajouté au
 * tunnel de réservation le 2026-09-04.
 */
class EstimatedArrivalTimeTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(): Room
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);
        return Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);
    }

    public function test_estimated_arrival_time_is_stored_when_provided(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', [
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 1,
            'residence_country' => "Côte d'Ivoire",
            'estimated_arrival_time' => '18:30',
        ])->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertStringStartsWith('18:30', $booking->estimated_arrival_time);
    }

    public function test_booking_can_be_created_without_estimated_arrival_time(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', [
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 1,
            'residence_country' => "Côte d'Ivoire",
        ])->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertNull($booking->estimated_arrival_time);
    }

    public function test_invalid_time_format_is_rejected(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/bookings', [
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 1,
            'residence_country' => "Côte d'Ivoire",
            'estimated_arrival_time' => 'not-a-time',
        ])->assertStatus(422);
    }
}
