<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\LoyaltyRewardTier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Simule des voyageurs traversant le Programme Membre (doc client
 * "Programme de Fidélité", §2-8 et §16) : gain de points au check-out,
 * exclusion des réservations annulées, montée de niveau, parrainage au
 * 1er séjour du filleul, réclamation d'un bon de réduction.
 */
class LoyaltyProgramTest extends TestCase
{
    use RefreshDatabase;

    public function test_points_are_awarded_after_checkout_only(): void
    {
        $traveler = User::factory()->create();

        // Séjour terminé, confirmé -> éligible (1 000 FCFA = 1 point, doc §2.1).
        $checkedOut = Booking::factory()->checkedOut()->for($traveler)->create(['total_price' => 120000]);

        // Encore en cours (check-out dans le futur) -> pas encore éligible.
        $ongoing = Booking::factory()->for($traveler)->create([
            'check_in' => now()->subDay(),
            'check_out' => now()->addDays(3),
            'status' => 'confirmed',
            'total_price' => 90000,
        ]);

        // Annulée -> jamais de points (doc §19 : "Aucun point n'est attribué
        // en cas d'annulation"). checkedOut() en premier pour les dates,
        // cancelled() en dernier pour que son statut ne soit pas écrasé.
        $cancelled = Booking::factory()->checkedOut()->cancelled()->for($traveler)->create(['total_price' => 200000]);

        $this->artisan('loyalty:award-points')->assertExitCode(0);

        $traveler->refresh();

        // 120 points pour le séjour terminé, rien d'autre.
        $this->assertSame(120, $traveler->loyalty_points_lifetime);
        $this->assertSame(120, $traveler->loyalty_points_balance);

        $this->assertNotNull($checkedOut->fresh()->loyalty_points_awarded_at);
        $this->assertNull($ongoing->fresh()->loyalty_points_awarded_at);
        // La commande ne sélectionne que les réservations confirmées : une
        // annulée n'est jamais examinée, donc jamais marquée traitée non plus.
        $this->assertNull($cancelled->fresh()->loyalty_points_awarded_at);
    }

    public function test_member_reaches_argent_tier_once_lifetime_threshold_is_crossed(): void
    {
        // fresh() : "bronze" est un défaut posé au niveau de la colonne SQL,
        // pas rempli sur l'instance PHP tant qu'on ne relit pas la ligne.
        $traveler = User::factory()->create()->fresh();
        $this->assertSame('bronze', $traveler->loyalty_tier);

        // 600 000 FCFA -> 600 points, au-delà du seuil Argent (500 points, doc §3).
        Booking::factory()->checkedOut()->for($traveler)->create(['total_price' => 600000]);

        $this->artisan('loyalty:award-points')->assertExitCode(0);

        $this->assertSame('argent', $traveler->fresh()->loyalty_tier);
    }

    public function test_referral_bonus_is_credited_to_both_on_filleuls_first_completed_stay(): void
    {
        $parrain = User::factory()->create();
        $filleul = User::factory()->create(['referred_by_user_id' => $parrain->id]);

        Booking::factory()->checkedOut()->for($filleul)->create(['total_price' => 10000]);

        $this->artisan('loyalty:award-points')->assertExitCode(0);

        // 10 points pour le séjour + 50 points de bonus parrainage (doc §7 : 50/50).
        $this->assertSame(60, $filleul->fresh()->loyalty_points_balance);
        $this->assertSame(50, $parrain->fresh()->loyalty_points_balance);
    }

    public function test_member_can_claim_a_reward_voucher_from_the_cagnotte(): void
    {
        $traveler = User::factory()->create(['loyalty_points_balance' => 500, 'loyalty_points_lifetime' => 500]);
        $rewardTier = LoyaltyRewardTier::where('points_required', 500)->firstOrFail();

        Sanctum::actingAs($traveler);

        $response = $this->postJson('/api/me/loyalty/claim-voucher', ['reward_tier_id' => $rewardTier->id]);

        $response->assertCreated();
        $this->assertSame(0, $traveler->fresh()->loyalty_points_balance);
        $this->assertDatabaseHas('loyalty_vouchers', [
            'user_id' => $traveler->id,
            'discount_percent' => 5,
            'status' => 'available',
        ]);
    }
}
