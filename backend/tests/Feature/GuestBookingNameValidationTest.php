<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-08 : lors d'une réservation en tant qu'invité, le
 * champ "nom" refusait les caractères accentués (l'ancienne règle
 * regex:/^[a-zA-Z...]+$/ était limitée à l'ASCII). Les noms ivoiriens
 * courants (Koné, N'Guessan, François, Aké…) étaient rejetés.
 */
class GuestBookingNameValidationTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(): Room
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);
        return Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 4,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);
    }

    private function payload(Room $room, string $name): array
    {
        return [
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 2,
            'residence_country' => "Côte d'Ivoire",
            'name' => $name,
            'email' => 'invite' . random_int(1000, 9999) . '@example.com',
            'phone' => '+2250700000000',
        ];
    }

    public function test_guest_booking_accepts_accented_and_hyphenated_names(): void
    {
        $names = [
            'François Koné',
            "Aya N'Guessan",
            'Jean-Baptiste Aké',
            'Marie N’Diaye',   // apostrophe typographique
            'K. Yao',
        ];

        foreach ($names as $name) {
            $room = $this->makeRoom();
            $this->postJson('/api/bookings', $this->payload($room, $name))
                ->assertCreated();
        }
    }

    public function test_guest_booking_still_rejects_names_with_digits_or_markup(): void
    {
        $room = $this->makeRoom();

        $this->postJson('/api/bookings', $this->payload($room, 'Tourist123'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->postJson('/api/bookings', $this->payload($room, '<script>alert(1)</script>'))
            ->assertStatus(422);

        $this->assertSame(0, Booking::count());
    }
}
