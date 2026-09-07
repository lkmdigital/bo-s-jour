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
 * Retour client 2026-09-02 (Partie 4.11) : "Une fois que le nombre de
 * voyageurs est ≥ 2, il faut proposer : ☐ Autre petit déjeuner [...]
 * afficher un champ de saisie libre permettant au voyageur de préciser
 * le nombre de petit-déjeuner souhaité."
 *
 * Relié au système de petit-déjeuner déjà existant sur l'établissement
 * (breakfast_included / breakfast_included_persons / breakfast_price,
 * jusqu'ici purement informatif) : "Autre" = des petits-déjeuners
 * supplémentaires, au-delà de ceux inclus gratuitement, facturés au
 * tarif breakfast_price de l'hôte et ajoutés à base_price/total_price
 * (jamais réduits par une promo/bon voyageur, comme pour le prix de la
 * chambre — confirmé par l'utilisateur : construire le vrai système,
 * pas seulement la case à cocher).
 */
class ExtraBreakfastTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(?float $breakfastPrice = 2500): Room
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'breakfast_included' => true,
            'breakfast_included_persons' => 1,
            'breakfast_price' => $breakfastPrice,
        ]);
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

    private function bookingPayload(Room $room, array $overrides = []): array
    {
        return array_merge([
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 2,
            'residence_country' => "Côte d'Ivoire",
        ], $overrides);
    }

    public function test_extra_breakfast_is_added_to_base_price_and_total_price(): void
    {
        $room = $this->makeRoom(breakfastPrice: 2500);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'extra_breakfast_quantity' => 3,
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        // 2 nuits x 20000 = 40000, + 3 x 2500 = 7500 -> 47500
        $this->assertSame(3, $booking->extra_breakfast_quantity);
        $this->assertSame('2500.00', $booking->extra_breakfast_unit_price);
        $this->assertSame('7500.00', $booking->extra_breakfast_total);
        $this->assertSame('47500.00', $booking->base_price);
        $this->assertSame('47500.00', $booking->total_price);
    }

    public function test_booking_without_extra_breakfast_defaults_to_zero(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(0, $booking->extra_breakfast_quantity);
        $this->assertNull($booking->extra_breakfast_unit_price);
        $this->assertSame('0.00', $booking->extra_breakfast_total);
        $this->assertSame('40000.00', $booking->total_price);
    }

    public function test_extra_breakfast_is_rejected_when_fewer_than_two_guests(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'guests' => 1,
            'extra_breakfast_quantity' => 2,
        ]))->assertStatus(422);

        $this->assertSame(0, Booking::count());
    }

    public function test_extra_breakfast_is_rejected_when_accommodation_has_no_breakfast_price(): void
    {
        $room = $this->makeRoom(breakfastPrice: null);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'extra_breakfast_quantity' => 1,
        ]))->assertStatus(422);

        $this->assertSame(0, Booking::count());
    }

    public function test_extra_breakfast_is_not_discounted_by_a_promo_code(): void
    {
        $room = $this->makeRoom(breakfastPrice: 2000);
        \App\Models\Promotion::create([
            'accommodation_id' => $room->accommodation_id,
            'room_id' => null,
            'discount_type' => 'percent',
            'discount_percent' => 10,
            'is_active' => true,
            'start_date' => now()->subDay(),
            'end_date' => now()->addMonth(),
        ]);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'extra_breakfast_quantity' => 2,
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        // Chambre : 40000 - 10% = 36000. Petit-déj : 2 x 2000 = 4000, jamais remisé.
        // base_price = 40000 (chambre, AVANT remise) + 4000 (petit-déj) = 44000.
        // total_price = 36000 (chambre APRÈS remise) + 4000 (petit-déj) = 40000.
        $this->assertSame('4000.00', $booking->extra_breakfast_total);
        $this->assertSame('44000.00', $booking->base_price);
        $this->assertSame('40000.00', $booking->total_price);
    }
}
