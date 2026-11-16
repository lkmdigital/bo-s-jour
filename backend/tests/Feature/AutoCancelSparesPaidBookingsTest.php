<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Entre le 11 et le 15 novembre 2026, 7 réservations payées au tarif de paiement intégral (réduction comprise) ont été annulées
 * automatiquement « faute de paiement ». Une réservation dont les paiements couvrent le prix n'est plus jamais annulée automatiquement.
 */
class AutoCancelSparesPaidBookingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Bus::fake();
    }

    private function unpaid(float $paid, array $overrides = []): Booking
    {
        $booking = Booking::factory()->for(User::factory()->create(['role' => 'user']))->create(array_merge([
            'accommodation_id' => Accommodation::factory()->create(['status' => 'published'])->id,
            'status' => 'pending', 'payment_status' => 'pending', 'total_price' => 44000, 'base_price' => 44000,
            'amount_paid' => $paid, 'payment_type' => 'full', 'deposit_amount' => 41800,
            'expires_at' => now()->subHour(), 'room_id' => null,
            'check_in' => now()->addDays(3)->toDateString(), 'check_out' => now()->addDays(5)->toDateString(),
        ], $overrides));
        if ($paid > 0) {
            Payment::create([
                'booking_id' => $booking->id, 'user_id' => $booking->user_id, 'amount' => $paid, 'status' => 'completed', 'purpose' => 'full',
                'payment_method' => 'wave-ci', 'payment_reference' => 'REF-' . uniqid(), 'transaction_id' => 'txn-' . uniqid(), 'paid_at' => now()->subDay(),
            ]);
        }

        return $booking;
    }

    public function test_an_expired_booking_already_paid_at_the_announced_amount_is_not_cancelled(): void
    {
        $paid = $this->unpaid(41800);
        $partial = $this->unpaid(20000);
        $nothing = $this->unpaid(0);

        $this->artisan('bookings:cancel-expired')->assertSuccessful();

        $this->assertSame('pending', $paid->fresh()->status->value, 'payée : jamais annulée « faute de paiement »');
        $this->assertSame('cancelled', $partial->fresh()->status->value, 'paiement partiel : la règle existante continue de s\'appliquer');
        $this->assertSame('cancelled', $nothing->fresh()->status->value);
    }

    public function test_the_day_before_arrival_cancellation_also_spares_a_paid_booking_and_sends_it_no_reminder(): void
    {
        $paid = $this->unpaid(41800, ['expires_at' => null, 'check_in' => now()->addDay()->toDateString(), 'check_out' => now()->addDays(2)->toDateString()]);
        $unpaid = $this->unpaid(0, ['expires_at' => null, 'check_in' => now()->addDay()->toDateString(), 'check_out' => now()->addDays(2)->toDateString()]);

        $this->artisan('bookings:remind-cancel-unpaid')->assertSuccessful();

        $this->assertSame('pending', $paid->fresh()->status->value);
        $this->assertSame('cancelled', $unpaid->fresh()->status->value);
    }

    public function test_a_paid_booking_is_not_reminded_to_pay(): void
    {
        $paid = $this->unpaid(41800, ['expires_at' => null, 'created_at' => now()->subDays(3)]);

        $this->artisan('bookings:remind-cancel-unpaid')->assertSuccessful();

        Mail::assertNothingSent();
        $this->assertSame('pending', $paid->fresh()->status->value);
    }
}
