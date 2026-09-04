<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Commission;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 2) : "Conserver systématiquement le prix
 * d'origine fixé par l'hôtelier" — la commission BoSéjour et le montant net
 * reversé à l'hôte doivent être calculés sur le tarif plein (base_price),
 * jamais réduits par une promo/bon de fidélité voyageur. Confirmé avec
 * l'utilisateur : uniquement pour les nouvelles réservations, pas de
 * recalcul rétroactif des commissions déjà en attente.
 */
class CommissionBasePriceTest extends TestCase
{
    use RefreshDatabase;

    private function configureMaliaPay(): void
    {
        config([
            'services.malia_pay.api_url' => 'https://sandbox.malia.test/api',
            'services.malia_pay.api_key' => 'test-key',
            'services.malia_pay.merchant_id' => 'test-merchant',
            'services.malia_pay.sandbox' => true,
        ]);
    }

    public function test_commission_uses_base_price_not_discounted_total_price(): void
    {
        $this->configureMaliaPay();
        $traveler = User::factory()->create();
        // Tarif plein 30 000, réduit à 25 000 par une promo -> l'hôte doit quand
        // même être payé sur 30 000, pas 25 000.
        $booking = Booking::factory()->for($traveler)->create([
            'payment_status' => 'pending',
            'base_price' => 30000,
            'total_price' => 25000,
        ]);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 25000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-BASEPRICE-1',
        ]);

        $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-BASEPRICE-1',
            'status' => 'success',
            'transaction_id' => 'FAKE_TX_BASEPRICE',
            'montant' => 25000,
        ])->assertOk();

        $commission = Commission::where('booking_id', $booking->id)->first();
        $this->assertNotNull($commission);
        $this->assertSame('30000.00', $commission->booking_amount);
        $this->assertNotSame('25000.00', $commission->booking_amount, "l'hôte ne doit pas être payé sur le prix remisé");
    }

    public function test_legacy_booking_without_base_price_falls_back_to_total_price(): void
    {
        $this->configureMaliaPay();
        $traveler = User::factory()->create();
        // Réservation créée avant l'ajout de base_price : pas de recalcul
        // rétroactif, comportement historique préservé (base sur total_price).
        $booking = Booking::factory()->for($traveler)->create([
            'payment_status' => 'pending',
            'base_price' => null,
            'total_price' => 40000,
        ]);
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 40000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-LEGACY-1',
        ]);

        $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-LEGACY-1',
            'status' => 'success',
            'transaction_id' => 'FAKE_TX_LEGACY',
            'montant' => 40000,
        ])->assertOk();

        $commission = Commission::where('booking_id', $booking->id)->first();
        $this->assertNotNull($commission);
        $this->assertSame('40000.00', $commission->booking_amount);
    }
}
