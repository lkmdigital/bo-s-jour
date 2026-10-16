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
 * Le numéro saisi dans le formulaire de réservation doit recevoir les messages de cette réservation,
 * même pour un voyageur connecté (cas réel du 2026-10-16 : le message partait vers le téléphone du
 * profil, le numéro du formulaire étant ignoré).
 */
class BookingContactPhoneTest extends TestCase
{
    use RefreshDatabase;

    private function room(): Room
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);

        return Room::create([
            'accommodation_id' => $accommodation->id, 'name' => 'Chambre standard', 'type' => 'double',
            'capacity' => 4, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 1,
        ]);
    }

    private function payload(Room $room, array $extra = []): array
    {
        return array_merge([
            'accommodation_id' => $room->accommodation_id, 'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(), 'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 2, 'residence_country' => "Côte d'Ivoire",
        ], $extra);
    }

    public function test_a_logged_in_traveler_gets_the_booking_messages_on_the_phone_typed_in_the_form(): void
    {
        $user = User::factory()->create(['phone' => '+22567316124']);
        Sanctum::actingAs($user);

        $id = $this->postJson('/api/bookings', $this->payload($this->room(), ['phone' => '0161133466']))
            ->assertCreated()->json('id');

        $booking = Booking::findOrFail($id);
        $this->assertSame('0161133466', $booking->traveler_phone);
        $this->assertFalse((bool) $booking->booked_for_third_party);

        // Tous les messages au voyageur lisent traveler_phone en premier.
        $phone = $booking->traveler_phone ?: $booking->user->phone;
        $this->assertSame('0161133466', $phone);
    }

    public function test_without_a_typed_phone_it_falls_back_to_the_account_phone(): void
    {
        Sanctum::actingAs(User::factory()->create(['phone' => '+22567316124']));

        $id = $this->postJson('/api/bookings', $this->payload($this->room()))->assertCreated()->json('id');

        $booking = Booking::findOrFail($id);
        $this->assertNull($booking->traveler_phone);
        $this->assertSame('+22567316124', $booking->traveler_phone ?: $booking->user->phone);
    }

    public function test_an_invalid_phone_is_refused(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/bookings', $this->payload($this->room(), ['phone' => 'abc<script>']))
            ->assertStatus(422)->assertJsonValidationErrors(['phone']);
    }
}
