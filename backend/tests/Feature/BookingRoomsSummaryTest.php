<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Message;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Retour client 2026-11-12 : « 2 voyageurs » ne dit pas combien de chambres ni de quel type. */
class BookingRoomsSummaryTest extends TestCase
{
    use RefreshDatabase;

    private function bookingWithRooms(int $quantity): Booking
    {
        $accommodation = Accommodation::factory()->create();
        $room = Room::create([
            'accommodation_id' => $accommodation->id, 'name' => 'Chambre standard', 'type' => 'double',
            'capacity' => 2, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 5,
        ]);

        return Booking::factory()->create([
            'accommodation_id' => $accommodation->id, 'room_id' => $room->id,
            'rooms_quantity' => $quantity, 'guests' => 2,
        ]);
    }

    public function test_summary_gives_quantity_name_and_category(): void
    {
        $this->assertSame('2 × Chambre standard (Double)', $this->bookingWithRooms(2)->roomsSummary());
        $this->assertSame('1 × Chambre standard (Double)', $this->bookingWithRooms(1)->roomsSummary());
    }

    public function test_summary_is_null_without_a_room(): void
    {
        $this->assertNull(Booking::factory()->create(['room_id' => null])->roomsSummary());
    }

    public function test_host_alert_states_the_rooms_booked(): void
    {
        $booking = $this->bookingWithRooms(2);

        Message::notifyHostNewBooking($booking);

        $message = Message::where('recipient_id', $booking->accommodation->host_id)->latest('id')->first();
        $this->assertStringContainsString('2 × Chambre standard (Double)', $message->body);
    }
}
