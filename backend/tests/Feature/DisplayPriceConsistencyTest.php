<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Room;
use App\Services\RoomPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-08 : un tarif affiché "à partir de 30 000" puis
 * facturé 33 000 au paiement (majoration "Tarif modifiable" +10 %
 * appliquée automatiquement). Le prix affiché doit être celui réellement
 * facturé.
 */
class DisplayPriceConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_display_price_includes_the_modifiable_surcharge(): void
    {
        $acc = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 30000,
            'cancellation_policy_hours' => 48,
            'pricing_modifiable_enabled' => true,
            'pricing_modifiable_surcharge' => 10,
        ]);

        $this->assertSame(33000.0, RoomPricingService::getDisplayPricePerNight(30000, $acc));

        $this->getJson("/api/accommodations/{$acc->id}")
            ->assertOk()
            ->assertJsonPath('effective_price_per_night', 33000);
    }

    public function test_display_price_includes_the_non_refundable_discount(): void
    {
        $acc = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 30000,
            'cancellation_policy_hours' => 0,
            'pricing_non_refundable_enabled' => true,
            'pricing_non_refundable_discount' => 10,
        ]);

        $this->assertSame(27000.0, RoomPricingService::getDisplayPricePerNight(30000, $acc));
    }

    public function test_display_price_is_the_base_when_no_plan_is_enabled(): void
    {
        $acc = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 30000,
            'cancellation_policy_hours' => 48,
        ]);

        $this->assertSame(30000.0, RoomPricingService::getDisplayPricePerNight(30000, $acc));
        $this->getJson("/api/accommodations/{$acc->id}")
            ->assertJsonPath('effective_price_per_night', 30000);
    }

    public function test_display_price_matches_the_price_preview_effective_price_for_an_advance_booking(): void
    {
        $acc = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 30000,
            'cancellation_policy_hours' => 48,
            'pricing_modifiable_enabled' => true,
            'pricing_modifiable_surcharge' => 10,
        ]);
        Room::create([
            'accommodation_id' => $acc->id,
            'name' => 'Standard', 'type' => 'double', 'capacity' => 2,
            'price_per_night' => 30000, 'is_active' => true, 'quantity' => 1,
        ]);

        $checkIn = now()->addDays(20)->toDateString();
        $checkOut = now()->addDays(21)->toDateString(); // 1 nuit, réservation à l'avance

        $preview = $this->getJson("/api/accommodations/{$acc->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}")
            ->assertOk()->json();

        // Le prix "à partir de" affiché == le prix effectif du devis (1 nuit).
        $this->assertSame(
            RoomPricingService::getDisplayPricePerNight(30000, $acc),
            (float) $preview['effective_price_per_night']
        );
        $this->assertSame(33000.0, (float) $preview['total']);
    }

    public function test_rooms_in_the_detail_payload_also_carry_the_effective_price(): void
    {
        $acc = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 20000,
            'cancellation_policy_hours' => 48,
            'pricing_modifiable_enabled' => true,
            'pricing_modifiable_surcharge' => 10,
        ]);
        Room::create([
            'accommodation_id' => $acc->id,
            'name' => 'Suite', 'type' => 'suite', 'capacity' => 2,
            'price_per_night' => 50000, 'is_active' => true, 'quantity' => 1,
        ]);

        $this->getJson("/api/accommodations/{$acc->id}")
            ->assertOk()
            ->assertJsonPath('rooms.0.effective_price_per_night', 55000);
    }
}
