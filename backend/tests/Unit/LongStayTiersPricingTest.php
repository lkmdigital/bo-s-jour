<?php

namespace Tests\Unit;

use App\Models\Accommodation;
use App\Services\RoomPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 3) : remises automatiques long séjour à
 * 3 paliers (3-5 nuits 5%, 6-10 nuits 10%, 11+ nuits 15%, désactivé par
 * défaut, chaque palier activable indépendamment).
 */
class LongStayTiersPricingTest extends TestCase
{
    use RefreshDatabase;

    private function tiers(): array
    {
        return [
            ['min_nights' => 3, 'max_nights' => 5, 'discount_percent' => 5, 'enabled' => true],
            ['min_nights' => 6, 'max_nights' => 10, 'discount_percent' => 10, 'enabled' => true],
            ['min_nights' => 11, 'max_nights' => null, 'discount_percent' => 15, 'enabled' => false],
        ];
    }

    public function test_resolves_correct_tier_for_each_night_count(): void
    {
        $tiers = $this->tiers();

        $this->assertNull(RoomPricingService::resolveLongStayTier($tiers, 2), '2 nuits : sous le premier palier');
        $this->assertSame(5.0, (float) RoomPricingService::resolveLongStayTier($tiers, 3)['discount_percent']);
        $this->assertSame(5.0, (float) RoomPricingService::resolveLongStayTier($tiers, 5)['discount_percent']);
        $this->assertSame(10.0, (float) RoomPricingService::resolveLongStayTier($tiers, 6)['discount_percent']);
        $this->assertSame(10.0, (float) RoomPricingService::resolveLongStayTier($tiers, 10)['discount_percent']);
        // Palier 11+ désactivé dans ce jeu de données : pas de remise au-delà de 10 nuits.
        $this->assertNull(RoomPricingService::resolveLongStayTier($tiers, 15));
    }

    public function test_matches_the_documented_example(): void
    {
        // Doc: "3 nuitées x 26 000 FCFA : 78 000 FCFA / Remise séjour longue
        // durée (3-5 nuits 5%): -3 900 FCFA / TOTAL À PAYER : 74 100 FCFA"
        $accommodation = Accommodation::factory()->make([
            'pricing_long_stay_enabled' => true,
            'pricing_long_stay_tiers' => $this->tiers(),
        ]);

        $effective = RoomPricingService::getEffectivePricePerNight(26000, 48, 3, $accommodation, now()->addDays(10)->toDateString());
        $total = round($effective * 3, 2);

        $this->assertSame(24700.0, $effective);
        $this->assertSame(74100.0, $total);
    }

    public function test_disabled_third_tier_falls_back_to_no_discount_above_ten_nights(): void
    {
        $accommodation = Accommodation::factory()->make([
            'pricing_long_stay_enabled' => true,
            'pricing_long_stay_tiers' => $this->tiers(),
        ]);

        $effective = RoomPricingService::getEffectivePricePerNight(20000, 48, 15, $accommodation, now()->addDays(20)->toDateString());

        $this->assertSame(20000.0, $effective, 'palier 11+ désactivé -> tarif plein');
    }

    public function test_long_stay_master_toggle_off_disables_all_tiers(): void
    {
        $accommodation = Accommodation::factory()->make([
            'pricing_long_stay_enabled' => false,
            'pricing_long_stay_tiers' => $this->tiers(),
        ]);

        $effective = RoomPricingService::getEffectivePricePerNight(20000, 48, 7, $accommodation, now()->addDays(20)->toDateString());

        $this->assertSame(20000.0, $effective);
    }
}
