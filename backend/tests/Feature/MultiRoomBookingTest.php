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
 * Retour client 2026-09-02 (Partie 4.3) : "nombre de chambres" attendu dans
 * le détail d'une réservation — une réservation ne portait qu'UNE chambre
 * jusqu'ici (room_id singulier). Construit la réservation multi-chambres :
 * plusieurs unités du MÊME type de chambre en une seule réservation,
 * appuyée sur rooms.quantity (déjà utilisé par le contrôle de disponibilité
 * quantity-aware, Partie 4.5) — pas un panier multi-types de chambres.
 */
class MultiRoomBookingTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(int $quantity = 3): Room
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

    public function test_booking_two_rooms_multiplies_the_price(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 2,
            'guests' => 4,
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        // 2 nuits x 20000 x 2 chambres = 80000
        $this->assertSame(2, $booking->rooms_quantity);
        $this->assertSame('80000.00', $booking->base_price);
        $this->assertSame('80000.00', $booking->total_price);
    }

    public function test_booking_without_rooms_quantity_defaults_to_one(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(1, $booking->rooms_quantity);
        $this->assertSame('40000.00', $booking->total_price);
    }

    public function test_guests_are_checked_against_capacity_times_rooms_quantity(): void
    {
        $room = $this->makeRoom(); // capacity 2 par chambre
        Sanctum::actingAs(User::factory()->create());

        // 4 voyageurs pour 1 seule chambre (capacité 2) -> refusé
        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 1,
            'guests' => 4,
        ]))->assertStatus(400);

        // 4 voyageurs pour 2 chambres (capacité totale 4) -> accepté
        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 2,
            'guests' => 4,
        ]))->assertCreated();
    }

    public function test_rooms_quantity_cannot_exceed_the_rooms_total_units(): void
    {
        $room = $this->makeRoom(quantity: 3);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 4,
            'guests' => 8,
        ]))->assertStatus(422);

        $this->assertSame(0, Booking::count());
    }

    public function test_availability_check_accounts_for_units_already_consumed_by_other_bookings(): void
    {
        $room = $this->makeRoom(quantity: 3);

        // Un premier voyageur consomme 2 des 3 unités disponibles.
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 2,
        ]))->assertCreated();

        // Un deuxième voyageur demande 2 unités -> il n'en reste qu'1 -> refusé.
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 2,
            'guests' => 4,
        ]))->assertStatus(409);

        // Mais 1 seule unité reste disponible -> acceptée.
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 1,
        ]))->assertCreated();

        $this->assertSame(2, Booking::where('room_id', $room->id)->count());
    }

    public function test_commission_base_price_includes_the_rooms_multiplier(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'rooms_quantity' => 3,
            'guests' => 6,
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        // base_price doit refléter les 3 chambres, pas le tarif d'une seule
        // (la commission BoSéjour et le net hôtelier en dépendent).
        $this->assertSame('120000.00', $booking->base_price);
    }
}
