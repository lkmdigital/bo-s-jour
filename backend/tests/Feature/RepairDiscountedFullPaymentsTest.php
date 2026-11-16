<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Réparation des réservations restées « en attente » malgré un paiement intégral au tarif annoncé (voir FullPaymentDiscountSettlementTest). */
class RepairDiscountedFullPaymentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Bus::fake();
        Http::fake();
    }

    private function stuck(string $status = 'pending', float $paid = 41800): Booking
    {
        $booking = Booking::factory()->for(User::factory()->create(['role' => 'user']))->create([
            'accommodation_id' => Accommodation::factory()->create(['status' => 'published'])->id,
            'status' => $status, 'payment_status' => 'pending', 'total_price' => 44000, 'base_price' => 44000,
            'amount_paid' => $paid, 'payment_type' => 'full', 'deposit_amount' => 41800, 'expires_at' => now()->addDay(),
        ]);
        Payment::create([
            'booking_id' => $booking->id, 'user_id' => $booking->user_id, 'amount' => $paid, 'status' => 'completed', 'purpose' => 'full',
            'payment_method' => 'wave-ci', 'payment_reference' => 'REF-' . uniqid(), 'transaction_id' => 'txn-' . uniqid(), 'paid_at' => now(),
        ]);

        return $booking;
    }

    public function test_the_preview_changes_nothing(): void
    {
        $booking = $this->stuck();

        $this->artisan('payments:repair-discounted-full')->expectsOutputToContain('réparable')->assertSuccessful();

        $this->assertSame('pending', $booking->fresh()->payment_status);
    }

    public function test_apply_settles_and_confirms_live_bookings_without_double_counting_the_payment(): void
    {
        $booking = $this->stuck();

        $this->artisan('payments:repair-discounted-full', ['--apply' => true])->assertSuccessful();

        $fresh = $booking->fresh();
        $this->assertSame('paid', $fresh->payment_status);
        $this->assertSame('confirmed', $fresh->status->value);
        $this->assertEquals(41800, $fresh->amount_paid, 'le montant réellement encaissé, pas 44 000');
        $this->assertEquals(41800, $fresh->total_price);
        $this->assertEquals(44000, $fresh->base_price);
    }

    public function test_a_cancelled_booking_is_only_listed(): void
    {
        $booking = $this->stuck('cancelled');

        $this->artisan('payments:repair-discounted-full', ['--apply' => true])->expectsOutputToContain('à traiter à la main')->assertSuccessful();

        $fresh = $booking->fresh();
        $this->assertSame('cancelled', $fresh->status->value);
        $this->assertSame('pending', $fresh->payment_status);
    }

    public function test_a_really_partial_payment_is_left_alone(): void
    {
        $booking = $this->stuck('pending', 20000);

        $this->artisan('payments:repair-discounted-full', ['--apply' => true])->expectsOutputToContain('Aucune réservation concernée')->assertSuccessful();

        $this->assertSame('pending', $booking->fresh()->payment_status);
    }
}
