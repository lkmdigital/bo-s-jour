<?php

namespace Tests\Feature;

use App\Http\Controllers\PaymentController;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Constaté en production le 2026-11-15 : un voyageur qui règle le paiement intégral au tarif annoncé (réduction de 5 %) payait 41 800 FCFA
 * sur 44 000 ; la réservation restait « En attente » avec 2 200 FCFA de « reste à payer », sans confirmation, puis expirait.
 */
class FullPaymentDiscountSettlementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Bus::fake();
        Http::fake();
    }

    private function booking(float $total = 44000, string $type = 'full', float $deposit = 41800): Booking
    {
        return Booking::factory()->for(User::factory()->create(['role' => 'user']))->create([
            'accommodation_id' => Accommodation::factory()->create(['status' => 'published'])->id,
            'status' => 'pending', 'payment_status' => 'pending', 'total_price' => $total, 'base_price' => $total,
            'amount_paid' => 0, 'payment_type' => $type, 'deposit_amount' => $deposit, 'expires_at' => now()->addDay(),
        ]);
    }

    private function pay(Booking $booking, float $amount, string $purpose = 'full'): Booking
    {
        $payment = Payment::create([
            'booking_id' => $booking->id, 'user_id' => $booking->user_id, 'amount' => $amount, 'status' => 'pending',
            'purpose' => $purpose, 'payment_method' => 'wave-ci', 'payment_reference' => 'REF-' . uniqid(), 'transaction_id' => 'txn-' . uniqid(),
        ]);

        app(PaymentController::class)->confirmPaymentSuccess($payment->id, $payment->transaction_id, (int) $amount, [], 'test');

        return $booking->fresh();
    }

    public function test_a_full_payment_at_the_announced_discounted_amount_settles_and_confirms_the_booking(): void
    {
        $booking = $this->pay($this->booking(), 41800);

        $this->assertSame('paid', $booking->payment_status);
        $this->assertSame('confirmed', $booking->status->value);
        $this->assertEquals(0, $booking->remainingBalance(), 'plus de « reste à payer »');
        $this->assertEquals(41800, $booking->total_price, 'le prix dû est celui réglé : la réduction est consentie');
        $this->assertEquals(44000, $booking->base_price, "le tarif plein de l'hôte est conservé");
        $this->assertNull($booking->expires_at, 'la réservation n\'expire plus');
        $this->assertNotEmpty($booking->confirmation_code);
    }

    public function test_the_commission_is_still_computed_on_the_full_host_tariff(): void
    {
        $booking = $this->pay($this->booking(), 41800);

        $commission = Commission::where('booking_id', $booking->id)->firstOrFail();
        $this->assertGreaterThanOrEqual(44000 * 0.08 - 1, (float) $commission->commission_amount);
        $this->assertLessThanOrEqual(44000 * 0.10 + 1, (float) $commission->commission_amount, 'jamais calculée sur le montant réduit');
    }

    public function test_a_payment_below_the_announced_amount_does_not_settle(): void
    {
        $booking = $this->pay($this->booking(), 30000);

        $this->assertSame('pending', $booking->payment_status);
        $this->assertSame('pending', $booking->status->value);
        $this->assertEquals(44000, $booking->total_price);
        $this->assertEquals(14000, $booking->remainingBalance());
    }

    public function test_a_full_payment_at_the_plain_price_still_settles_without_touching_the_price(): void
    {
        $booking = $this->pay($this->booking(44000, 'full', 44000), 44000);

        $this->assertSame('paid', $booking->payment_status);
        $this->assertEquals(44000, $booking->total_price);
        $this->assertSame('confirmed', $booking->status->value);
    }

    public function test_without_a_discount_setting_a_discounted_amount_is_not_enough(): void
    {
        Setting::set('full_payment_discount_percent', 0, 'number');

        $booking = $this->pay($this->booking(44000, 'guarantee', 0), 41800);

        $this->assertSame('pending', $booking->payment_status, 'aucune réduction annoncée : 95 % ne soldent pas');
    }

    public function test_the_amount_really_asked_at_initiation_prevails_if_the_setting_changed_meanwhile(): void
    {
        Setting::set('full_payment_discount_percent', 0, 'number');   // réglage modifié après l'initiation à 41 800

        $booking = $this->pay($this->booking(44000, 'full', 41800), 41800);

        $this->assertSame('paid', $booking->payment_status);
    }
}
