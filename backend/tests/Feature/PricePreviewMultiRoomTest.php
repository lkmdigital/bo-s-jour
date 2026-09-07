<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.3) : réservation multi-chambres — le
 * devis affiché au voyageur dans le tunnel (avant même la création de la
 * réservation) doit refléter le nombre d'unités choisi.
 */
class PricePreviewMultiRoomTest extends TestCase
{
    use RefreshDatabase;

    public function test_price_preview_multiplies_total_by_rooms_quantity(): void
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 20000,
        ]);
        $checkIn = now()->addDays(10)->toDateString();
        $checkOut = now()->addDays(12)->toDateString(); // 2 nuits

        $response = $this->getJson(
            "/api/accommodations/{$accommodation->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}&rooms_quantity=3"
        )->assertOk();

        // 2 nuits x 20000 x 3 chambres = 120000
        $response->assertJsonPath('total', 120000);
    }

    public function test_price_preview_defaults_to_a_single_room(): void
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'price_per_night' => 20000,
        ]);
        $checkIn = now()->addDays(10)->toDateString();
        $checkOut = now()->addDays(12)->toDateString();

        $response = $this->getJson(
            "/api/accommodations/{$accommodation->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}"
        )->assertOk();

        $response->assertJsonPath('total', 40000);
    }
}
