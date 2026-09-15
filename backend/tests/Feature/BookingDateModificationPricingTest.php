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
 * Retour client 2026-09-15 : "Rajoute la possibilité de modifier la date sur
 * une reservation [...] et de modifier aussi le nombres de nuité." — la
 * modification de dates existait déjà (voir BookingWasModifiedTest) mais ne
 * recalculait jamais total_price/base_price : prolonger ou raccourcir un
 * séjour ne changeait pas le montant dû. Corrigé dans
 * BookingService::modifyDates() par une mise à l'échelle proportionnelle au
 * nouveau nombre de nuits (préserve le tarif par nuit réellement facturé,
 * remise éventuelle comprise, sans rejouer promotions/bon de fidélité).
 */
class BookingDateModificationPricingTest extends TestCase
{
    use RefreshDatabase;

    private function makeBooking(array $overrides = []): Booking
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);
        $room = Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 4,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 2,
        ]);

        return Booking::factory()->create(array_merge([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'confirmed',
            'guests' => 2,
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12), // 2 nuits
            'rooms_quantity' => 1,
            'base_price' => 40000,   // 20000 x 2 nuits
            'total_price' => 40000,
            'extra_breakfast_total' => 0,
        ], $overrides));
    }

    public function test_extending_the_stay_increases_the_price_proportionally(): void
    {
        $booking = $this->makeBooking();
        Sanctum::actingAs($booking->user);

        $response = $this->putJson("/api/bookings/{$booking->id}", [
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(14)->toDateString(), // 2 nuits -> 4 nuits
        ])->assertOk();

        $this->assertSame('80000.00', $response->json('base_price'));
        $this->assertSame('80000.00', $response->json('total_price'));
    }

    public function test_shortening_the_stay_decreases_the_price_proportionally(): void
    {
        $booking = $this->makeBooking(['check_out' => now()->addDays(14), 'base_price' => 80000, 'total_price' => 80000]);
        Sanctum::actingAs($booking->user);

        $response = $this->putJson("/api/bookings/{$booking->id}", [
            'check_out' => now()->addDays(11)->toDateString(), // 4 nuits -> 1 nuit
        ])->assertOk();

        $this->assertSame('20000.00', $response->json('base_price'));
        $this->assertSame('20000.00', $response->json('total_price'));
    }

    public function test_a_discount_already_applied_is_preserved_proportionally(): void
    {
        // Remise de 10% déjà appliquée à la création (ex. promotion) :
        // total_price (36000) < base_price (40000). La remise par nuit doit
        // rester la même après extension, pas être ni perdue ni doublée.
        $booking = $this->makeBooking(['base_price' => 40000, 'total_price' => 36000]);
        Sanctum::actingAs($booking->user);

        $response = $this->putJson("/api/bookings/{$booking->id}", [
            'check_out' => now()->addDays(14)->toDateString(), // 2 nuits -> 4 nuits
        ])->assertOk();

        $this->assertSame('80000.00', $response->json('base_price'));
        $this->assertSame('72000.00', $response->json('total_price')); // 18000/nuit x 4
    }

    public function test_extra_breakfast_total_is_not_scaled_by_nights(): void
    {
        // Le petit-déjeuner supplémentaire est une quantité choisie par le
        // voyageur (forfaitaire), pas un montant par nuit.
        $booking = $this->makeBooking([
            'base_price' => 40000,
            'total_price' => 45000, // 40000 chambre + 5000 petit-déjeuner
            'extra_breakfast_total' => 5000,
        ]);
        Sanctum::actingAs($booking->user);

        $response = $this->putJson("/api/bookings/{$booking->id}", [
            'check_out' => now()->addDays(14)->toDateString(), // 2 nuits -> 4 nuits
        ])->assertOk();

        $this->assertSame('80000.00', $response->json('base_price'));
        $this->assertSame('85000.00', $response->json('total_price')); // 80000 chambre + 5000 petit-déjeuner inchangé
    }

    public function test_amount_paid_and_deposit_are_never_touched_by_a_date_change(): void
    {
        $booking = $this->makeBooking(['amount_paid' => 40000, 'deposit_amount' => 40000]);
        Sanctum::actingAs($booking->user);

        $this->putJson("/api/bookings/{$booking->id}", [
            'check_out' => now()->addDays(14)->toDateString(),
        ])->assertOk();

        $fresh = $booking->fresh();
        $this->assertSame('40000.00', $fresh->amount_paid);
        $this->assertSame('40000.00', $fresh->deposit_amount);
        // Le solde dû (total_price - amount_paid) augmente naturellement
        // puisque total_price est passé à 80000.
        $this->assertSame('80000.00', $fresh->total_price);
    }

    public function test_extending_into_dates_already_booked_on_the_same_room_is_rejected(): void
    {
        $booking = $this->makeBooking();
        $this->makeBooking([
            'room_id' => $booking->room_id,
            'check_in' => now()->addDays(14),
            'check_out' => now()->addDays(16),
            'rooms_quantity' => 2, // occupe toutes les unités disponibles (quantity: 2)
        ]);
        Sanctum::actingAs($booking->user);

        // Étendre la première réservation jusqu'à chevaucher la seconde doit être rejeté,
        // et le prix/les dates d'origine doivent rester intacts.
        $this->putJson("/api/bookings/{$booking->id}", [
            'check_out' => now()->addDays(15)->toDateString(),
        ])->assertStatus(409);

        $fresh = $booking->fresh();
        $this->assertSame(now()->addDays(12)->toDateString(), $fresh->check_out->toDateString());
        $this->assertSame('40000.00', $fresh->total_price);
    }
}
