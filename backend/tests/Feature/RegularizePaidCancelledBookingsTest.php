<?php

namespace Tests\Feature;

use App\Mail\BookingConfirmation;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\BookingHistory;
use App\Models\ClientCredit;
use App\Models\Commission;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Régularisation des réservations annulées automatiquement alors que le paiement intégral (réduction comprise) était encaissé. */
class RegularizePaidCancelledBookingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Bus::fake();
        Http::fake();
    }

    private function cancelled(int $startInDays = -10, ?Accommodation $accommodation = null, float $credit = 41800): Booking
    {
        $booking = Booking::factory()->for(User::factory()->create(['role' => 'user']))->create([
            'accommodation_id' => ($accommodation ?? Accommodation::factory()->create(['status' => 'published']))->id,
            'room_id' => null, 'rooms_quantity' => 1,
            'check_in' => now()->addDays($startInDays)->toDateString(), 'check_out' => now()->addDays($startInDays + 2)->toDateString(),
            'status' => 'cancelled', 'payment_status' => 'pending', 'total_price' => 44000, 'base_price' => 44000,
            'amount_paid' => 41800, 'payment_type' => 'full', 'deposit_amount' => 41800, 'expires_at' => null,
        ]);
        Payment::create([
            'booking_id' => $booking->id, 'user_id' => $booking->user_id, 'amount' => 41800, 'status' => 'completed', 'purpose' => 'full',
            'payment_method' => 'wave-ci', 'payment_reference' => 'REF-' . uniqid(), 'transaction_id' => 'txn-' . uniqid(), 'paid_at' => now()->subDays(3),
        ]);
        if ($credit > 0) {
            ClientCredit::create([
                'user_id' => $booking->user_id, 'amount' => $credit, 'currency' => 'XOF', 'source_booking_id' => $booking->id,
                'source_type' => ClientCredit::SOURCE_CANCELLATION, 'status' => ClientCredit::STATUS_AVAILABLE,
            ]);
        }

        return $booking;
    }

    public function test_the_preview_changes_nothing(): void
    {
        $booking = $this->cancelled();

        $this->artisan('payments:regularize-cancelled', ['ids' => [$booking->id]])->expectsOutputToContain('régularisable')->assertSuccessful();

        $this->assertSame('cancelled', $booking->fresh()->status->value);
        $this->assertSame(ClientCredit::STATUS_AVAILABLE, ClientCredit::first()->status);
    }

    public function test_a_past_stay_is_confirmed_paid_with_commission_and_the_credit_is_voided_without_any_message(): void
    {
        $booking = $this->cancelled(-10);

        $this->artisan('payments:regularize-cancelled', ['ids' => [$booking->id], '--apply' => true, '--notify' => true])->assertSuccessful();

        $fresh = $booking->fresh();
        $this->assertSame('confirmed', $fresh->status->value);
        $this->assertSame('paid', $fresh->payment_status);
        $this->assertEquals(41800, $fresh->amount_paid);
        $this->assertEquals(41800, $fresh->total_price);
        $this->assertEquals(44000, $fresh->base_price);
        $this->assertNotEmpty($fresh->booking_number);
        $this->assertNotEmpty($fresh->confirmation_code);
        $this->assertSame(1, Commission::where('booking_id', $booking->id)->count(), 'la commission est enregistrée');
        $this->assertSame(ClientCredit::STATUS_EXPIRED, ClientCredit::first()->status, "l'avoir n'est plus utilisable");
        $this->assertTrue(BookingHistory::where('booking_id', $booking->id)->where('action', 'regularized')->exists(), 'tracé dans l\'historique');
        Mail::assertNothingSent();   // séjour passé : aucune confirmation, même avec --notify
    }

    public function test_an_upcoming_stay_notifies_only_with_the_option(): void
    {
        $quiet = $this->cancelled(5);
        $this->artisan('payments:regularize-cancelled', ['ids' => [$quiet->id], '--apply' => true])->assertSuccessful();
        Mail::assertNothingSent();
        $this->assertSame('confirmed', $quiet->fresh()->status->value);

        $loud = $this->cancelled(8);
        $this->artisan('payments:regularize-cancelled', ['ids' => [$loud->id], '--apply' => true, '--notify' => true])->assertSuccessful();
        Mail::assertSent(BookingConfirmation::class);
    }

    public function test_a_used_credit_a_refund_or_taken_dates_are_refused(): void
    {
        $used = $this->cancelled(-10);
        ClientCredit::where('source_booking_id', $used->id)->update(['status' => ClientCredit::STATUS_USED]);

        $refunded = $this->cancelled(-10);
        $refunded->update(['refund_amount' => 41800, 'refunded_at' => now()]);

        $accommodation = Accommodation::factory()->create(['status' => 'published']);
        $future = $this->cancelled(6, $accommodation);
        Booking::factory()->for(User::factory()->create(['role' => 'user']))->create([   // quelqu'un d'autre a pris les dates
            'accommodation_id' => $accommodation->id, 'room_id' => null, 'status' => 'confirmed',
            'check_in' => now()->addDays(6)->toDateString(), 'check_out' => now()->addDays(8)->toDateString(),
        ]);

        $this->artisan('payments:regularize-cancelled', ['ids' => [$used->id, $refunded->id, $future->id], '--apply' => true])
            ->expectsOutputToContain('REFUSÉE')->assertSuccessful();

        foreach ([$used, $refunded, $future] as $b) {
            $this->assertSame('cancelled', $b->fresh()->status->value);
        }
    }

    public function test_a_booking_that_is_not_cancelled_or_is_unknown_is_left_alone(): void
    {
        $live = $this->cancelled();
        $live->update(['status' => 'pending']);

        $this->artisan('payments:regularize-cancelled', ['ids' => [$live->id, 999999], '--apply' => true])
            ->expectsOutputToContain('introuvable')->assertSuccessful();

        $this->assertSame('pending', $live->fresh()->status->value);
        $this->assertSame('pending', $live->fresh()->payment_status);
    }
}
