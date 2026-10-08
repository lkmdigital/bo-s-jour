<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use App\Services\PaymentOptionsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Décisions BoSéjour du 2026-10-08 sur la « Garantie de réservation » :
 * le montant suit le paramétrage de l'établissement (1re nuit, pourcentage ou
 * montant fixe) et le MÊME paramétrage alimente la fiche publique, l'aperçu de
 * prix (récapitulatif) et la page de paiement. Avant ce correctif, un pourcentage
 * pouvait être annoncé alors que le montant calculé était toujours la 1re nuit.
 */
class GuaranteePaymentOptionsTest extends TestCase
{
    use RefreshDatabase;

    /** 3 nuits à 50 000 FCFA = 150 000 FCFA, arrivée dans 10 jours, politique flexible. */
    private function preview(Accommodation $accommodation, int $nights = 3, int $inDays = 10): \Illuminate\Testing\TestResponse
    {
        $checkIn = now()->addDays($inDays)->toDateString();
        $checkOut = now()->addDays($inDays + $nights)->toDateString();

        return $this->getJson("/api/accommodations/{$accommodation->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}")
            ->assertOk();
    }

    private function accommodation(array $attributes = []): Accommodation
    {
        return Accommodation::factory()->create($attributes + [
            'status' => 'published',
            'price_per_night' => 50000,
            'cancellation_policy_hours' => 48,
            'deposit_required' => true,
            'deposit_amount' => 'first_night',
        ]);
    }

    public function test_first_night_guarantee_is_the_default(): void
    {
        $response = $this->preview($this->accommodation());

        $response->assertJsonPath('total', 150000);
        $response->assertJsonPath('payment_options.full_only', false);
        $response->assertJsonPath('payment_options.options.guarantee.label', 'Garantie de réservation');
        $response->assertJsonPath('payment_options.options.guarantee.summary', '1re nuit');
        $response->assertJsonPath('payment_options.options.guarantee.amount', 50000);
        $response->assertJsonPath('payment_options.options.guarantee.balance_at_hotel', 100000);
    }

    public function test_percentage_guarantee_uses_the_configured_percentage(): void
    {
        $response = $this->preview($this->accommodation(['deposit_amount' => 'percentage', 'deposit_percentage' => 30]));

        $response->assertJsonPath('payment_options.options.guarantee.summary', '30 % du séjour');
        $response->assertJsonPath('payment_options.options.guarantee.amount', 45000);
        $response->assertJsonPath('payment_options.options.guarantee.balance_at_hotel', 105000);
    }

    public function test_fixed_guarantee_uses_the_configured_amount(): void
    {
        $response = $this->preview($this->accommodation(['deposit_amount' => 'fixed', 'deposit_fixed_amount' => 20000]));

        $response->assertJsonPath('payment_options.options.guarantee.summary', '20 000 FCFA');
        $response->assertJsonPath('payment_options.options.guarantee.amount', 20000);
        $response->assertJsonPath('payment_options.options.guarantee.balance_at_hotel', 130000);
    }

    public function test_full_payment_keeps_its_five_percent_discount_and_wording(): void
    {
        $response = $this->preview($this->accommodation());

        $response->assertJsonPath('payment_options.options.full.label', 'Paiement intégral');
        $response->assertJsonPath('payment_options.options.full.amount', 142500);
        $response->assertJsonPath('payment_options.options.full.description', 'Payez la totalité maintenant et bénéficiez de 5 % de réduction.');
    }

    public function test_guarantee_wording_never_claims_it_is_non_refundable(): void
    {
        // Le remboursement suit la politique d'annulation de l'établissement (décision n° 3).
        $description = $this->preview($this->accommodation())->json('payment_options.options.guarantee.description');

        $this->assertSame(
            'Payez uniquement la garantie demandée par l\'établissement et réglez le solde directement à l\'établissement à votre arrivée.',
            $description
        );
        $this->assertStringNotContainsStringIgnoringCase('remboursable', $description);
    }

    public function test_full_payment_is_required_when_the_establishment_offers_no_guarantee(): void
    {
        $response = $this->preview($this->accommodation(['deposit_required' => false]));

        $response->assertJsonPath('payment_options.full_only', true);
        $response->assertJsonPath('payment_options.reason', 'cet établissement demande le paiement intégral');
        $response->assertJsonMissingPath('payment_options.options.guarantee');
    }

    /** Les trois cas conservés (décision n° 6), même avec une garantie paramétrée. */
    public function test_full_payment_stays_required_in_the_three_kept_cases(): void
    {
        $config = ['deposit_amount' => 'percentage', 'deposit_percentage' => 30];

        $this->preview($this->accommodation($config), nights: 3, inDays: 1)
            ->assertJsonPath('payment_options.full_only', true);
        $this->preview($this->accommodation($config), nights: 7)
            ->assertJsonPath('payment_options.full_only', true);
        $this->preview($this->accommodation($config + ['cancellation_policy_hours' => 0]))
            ->assertJsonPath('payment_options.full_only', true);
    }

    public function test_no_guarantee_when_it_would_cover_the_whole_stay(): void
    {
        // 1 nuit : la « 1re nuit » est le séjour entier, il n'y aurait aucun solde à régler.
        $this->preview($this->accommodation(), nights: 1)
            ->assertJsonPath('payment_options.full_only', true)
            ->assertJsonPath('payment_options.reason', 'la garantie demandée couvre la totalité du séjour');
    }

    public function test_public_listing_exposes_the_same_guarantee_as_the_payment_page(): void
    {
        $accommodation = $this->accommodation(['deposit_amount' => 'percentage', 'deposit_percentage' => 25]);

        $listing = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();
        $listing->assertJsonPath('guarantee.enabled', true);
        $listing->assertJsonPath('guarantee.type', 'percentage');
        $listing->assertJsonPath('guarantee.summary', '25 % du séjour');
        $listing->assertJsonPath('guarantee.label', 'Garantie de réservation');

        // Même paramétrage côté réservation / paiement
        $booking = Booking::factory()->create([
            'accommodation_id' => $accommodation->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(13)->toDateString(),
            'total_price' => 150000,
        ]);
        $options = PaymentOptionsService::getPaymentOptions($booking->fresh());

        $this->assertSame('25 % du séjour', $options['options']['guarantee']['summary']);
        $this->assertEquals(37500, $options['options']['guarantee']['amount']);
        $this->assertSame($listing->json('guarantee.summary'), $options['guarantee_config']['summary']);
    }

    public function test_a_change_of_configuration_is_reflected_everywhere_at_once(): void
    {
        $accommodation = $this->accommodation();
        $this->preview($accommodation)->assertJsonPath('payment_options.options.guarantee.amount', 50000);

        $accommodation->update(['deposit_amount' => 'fixed', 'deposit_fixed_amount' => 15000]);

        $this->getJson("/api/accommodations/{$accommodation->id}")->assertJsonPath('guarantee.summary', '15 000 FCFA');
        $this->preview($accommodation)->assertJsonPath('payment_options.options.guarantee.amount', 15000);
    }

    public function test_host_must_give_a_value_with_a_percentage_or_fixed_guarantee(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = $this->accommodation(['host_id' => $host->id]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_amount' => 'percentage'])
            ->assertStatus(422)->assertJsonValidationErrors('deposit_percentage');
        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_amount' => 'fixed'])
            ->assertStatus(422)->assertJsonValidationErrors('deposit_fixed_amount');
        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_amount' => 'percentage', 'deposit_percentage' => 100])
            ->assertStatus(422)->assertJsonValidationErrors('deposit_percentage');
    }

    public function test_switching_guarantee_type_clears_the_other_value(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = $this->accommodation(['host_id' => $host->id]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_amount' => 'percentage', 'deposit_percentage' => 40])->assertOk();
        $this->assertSame('40.00', $accommodation->fresh()->deposit_percentage);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_amount' => 'fixed', 'deposit_fixed_amount' => 25000])->assertOk();
        $fresh = $accommodation->fresh();
        $this->assertNull($fresh->deposit_percentage);
        $this->assertSame('25000.00', $fresh->deposit_fixed_amount);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_amount' => 'first_night'])->assertOk();
        $this->assertNull($accommodation->fresh()->deposit_fixed_amount);
    }

    public function test_host_can_require_full_payment_only(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = $this->accommodation(['host_id' => $host->id]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['deposit_required' => false])->assertOk();

        $this->assertFalse($accommodation->fresh()->deposit_required);
        $this->getJson("/api/accommodations/{$accommodation->id}")
            ->assertJsonPath('guarantee.enabled', false)
            ->assertJsonPath('guarantee.label', 'Paiement intégral');
    }

    public function test_extra_breakfasts_are_part_of_the_guarantee_base_like_in_the_real_booking(): void
    {
        // 150 000 + 6 petits-déjeuners à 5 000 = 180 000 ; 30 % = 54 000 (et non 45 000)
        $accommodation = $this->accommodation(['deposit_amount' => 'percentage', 'deposit_percentage' => 30, 'breakfast_price' => 5000]);
        $checkIn = now()->addDays(10)->toDateString();
        $checkOut = now()->addDays(13)->toDateString();

        $this->getJson("/api/accommodations/{$accommodation->id}/price-preview?check_in={$checkIn}&check_out={$checkOut}&extra_breakfast_quantity=6")
            ->assertOk()
            ->assertJsonPath('total', 150000)
            ->assertJsonPath('extra_breakfast_total', 30000)
            ->assertJsonPath('payment_options.options.guarantee.amount', 54000)
            ->assertJsonPath('payment_options.options.guarantee.balance_at_hotel', 126000)
            ->assertJsonPath('payment_options.options.full.amount', 171000);
    }

    public function test_a_type_without_a_usable_value_falls_back_to_the_first_night(): void
    {
        // Donnée incohérente (ancien enregistrement, import…) : le libellé suit le calcul.
        $accommodation = $this->accommodation(['deposit_amount' => 'percentage', 'deposit_percentage' => null]);

        $this->preview($accommodation)
            ->assertJsonPath('payment_options.options.guarantee.summary', '1re nuit')
            ->assertJsonPath('payment_options.options.guarantee.amount', 50000);
    }
}
