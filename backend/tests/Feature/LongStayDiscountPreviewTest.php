<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 3.3) : vérifie que /accommodations/{id}/
 * price-preview renvoie le détail de la remise long séjour appliquée,
 * exploité par le récapitulatif du tunnel de réservation (BookingWizard).
 */
class LongStayDiscountPreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_price_preview_includes_long_stay_discount_breakdown(): void
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 26000,
            'pricing_long_stay_enabled' => true,
            'pricing_long_stay_tiers' => [
                ['min_nights' => 3, 'max_nights' => 5, 'discount_percent' => 5, 'enabled' => true],
                ['min_nights' => 6, 'max_nights' => 10, 'discount_percent' => 10, 'enabled' => true],
                ['min_nights' => 11, 'max_nights' => null, 'discount_percent' => 15, 'enabled' => false],
            ],
        ]);

        $checkIn = now()->addDays(10)->toDateString();
        $checkOut = now()->addDays(13)->toDateString(); // 3 nuits

        $response = $this->getJson(
            "/api/accommodations/{$accommodation->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}"
        )->assertOk();

        $response->assertJsonPath('rate_type', 'long_stay');
        $response->assertJsonPath('total', 74100);
        $response->assertJsonPath('long_stay_discount.subtotal', 78000);
        $response->assertJsonPath('long_stay_discount.discount_percent', 5);
        $response->assertJsonPath('long_stay_discount.discount_amount', 3900);
    }

    public function test_price_preview_has_no_long_stay_discount_below_the_first_tier(): void
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 26000,
            'pricing_long_stay_enabled' => true,
            'pricing_long_stay_tiers' => [
                ['min_nights' => 3, 'max_nights' => 5, 'discount_percent' => 5, 'enabled' => true],
            ],
        ]);

        $checkIn = now()->addDays(10)->toDateString();
        $checkOut = now()->addDays(12)->toDateString(); // 2 nuits, sous le palier

        $response = $this->getJson(
            "/api/accommodations/{$accommodation->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}"
        )->assertOk();

        $response->assertJsonPath('rate_type', 'base');
        $response->assertJsonPath('long_stay_discount', null);
        $response->assertJsonPath('total', 52000);
    }
}
