<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

/**
 * Retour client 2026-09-18 : un voyageur sans compte doit pouvoir annuler
 * lui-même sa réservation (preuve = e-mail saisi à la réservation).
 */
class GuestBookingCancelTest extends TestCase
{
    use RefreshDatabase;

    private function guestBooking(array $attrs = []): Booking
    {
        $guest = User::factory()->create(['email' => 'invite@example.com', 'is_guest' => true]);
        $acc = Accommodation::factory()->create(['status' => 'published']);

        return Booking::factory()->for($guest)->create(array_merge([
            'accommodation_id' => $acc->id,
            'status' => 'awaiting_host_confirmation',
            'payment_status' => 'pending',
            'amount_paid' => 0,
        ], $attrs));
    }

    public function test_guest_can_cancel_with_the_booking_email(): void
    {
        Bus::fake();
        $booking = $this->guestBooking();

        $this->postJson("/api/bookings/{$booking->access_token}/guest-cancel", ['email' => 'INVITE@example.com'])->assertOk();

        $this->assertSame(BookingStatus::Cancelled, $booking->fresh()->status);
    }

    public function test_wrong_email_is_rejected_and_booking_untouched(): void
    {
        $booking = $this->guestBooking();

        $this->postJson("/api/bookings/{$booking->access_token}/guest-cancel", ['email' => 'autre@example.com'])->assertForbidden();

        $this->assertSame(BookingStatus::AwaitingHostConfirmation, $booking->fresh()->status);
    }

    public function test_booking_attached_to_an_activated_account_can_be_cancelled_with_its_email(): void
    {
        Bus::fake();
        $user = User::factory()->create(['email' => 'membre@example.com', 'is_guest' => false]);
        $booking = Booking::factory()->for($user)->create([
            'accommodation_id' => Accommodation::factory()->create(['status' => 'published'])->id,
            'status' => 'awaiting_host_confirmation',
            'payment_status' => 'pending',
            'amount_paid' => 0,
        ]);

        $this->postJson("/api/bookings/{$booking->access_token}/guest-cancel", ['email' => 'membre@example.com'])->assertOk();
        $this->assertSame(BookingStatus::Cancelled, $booking->fresh()->status);

        $other = Booking::factory()->for($user)->create([
            'accommodation_id' => $booking->accommodation_id,
            'status' => 'awaiting_host_confirmation',
            'payment_status' => 'pending',
            'amount_paid' => 0,
        ]);
        $this->postJson("/api/bookings/{$other->access_token}/guest-cancel", ['email' => 'intrus@example.com'])->assertForbidden();
    }

    public function test_paid_booking_cannot_be_cancelled_this_way(): void
    {
        $booking = $this->guestBooking(['status' => 'confirmed', 'payment_status' => 'paid', 'amount_paid' => 10000]);

        $this->postJson("/api/bookings/{$booking->access_token}/guest-cancel", ['email' => 'invite@example.com'])->assertStatus(422);
    }

    public function test_a_numeric_id_no_longer_opens_a_booking_for_an_anonymous_visitor(): void
    {
        $booking = $this->guestBooking();

        $this->postJson("/api/bookings/{$booking->id}/guest-cancel", ['email' => 'invite@example.com'])->assertNotFound();
        $this->getJson("/api/bookings/{$booking->id}")->assertNotFound();
        $this->getJson("/api/bookings/{$booking->access_token}")->assertOk()->assertJsonPath('id', $booking->id);
    }

    public function test_lookup_returns_the_secure_link_for_the_right_email_only(): void
    {
        $booking = $this->guestBooking(['booking_number' => 'BS-2026-000777']);

        $this->postJson('/api/bookings/lookup', ['reference' => 'bs-2026-000777', 'email' => 'INVITE@example.com'])
            ->assertOk()->assertJsonPath('access_token', $booking->access_token);
        $this->postJson('/api/bookings/lookup', ['reference' => (string) $booking->id, 'email' => 'invite@example.com'])
            ->assertOk();
        $this->postJson('/api/bookings/lookup', ['reference' => 'BS-2026-000777', 'email' => 'autre@example.com'])->assertNotFound();
    }
}
