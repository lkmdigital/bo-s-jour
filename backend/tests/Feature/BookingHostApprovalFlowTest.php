<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Room;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-16 : "positionner l'étape du paiement après la
 * confirmation de la disponibilité par l'hôte" — une demande démarre en
 * attente de l'hôte (awaiting_host_confirmation), pas directement payable.
 * L'hôte doit confirmer (→ pending, payable) ou refuser (→ cancelled) avant
 * tout paiement. Si l'hôte ne répond pas dans le délai, la demande expire
 * automatiquement (comme le mécanisme existant de 48h côté paiement).
 */
class BookingHostApprovalFlowTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(): array
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['status' => 'published', 'host_id' => $host->id]);
        $room = Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);

        return [$host, $accommodation, $room];
    }

    private function bookingPayload(Room $room): array
    {
        return [
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 1,
            'residence_country' => "Côte d'Ivoire",
        ];
    }

    public function test_a_normal_booking_request_starts_awaiting_host_confirmation_with_a_response_deadline(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        Mail::fake();

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room));
        $response->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(BookingStatus::AwaitingHostConfirmation, $booking->status);
        $this->assertNotNull($booking->expires_at);
        $this->assertTrue($booking->expires_at->between(now()->addHours(23), now()->addHours(25)));
    }

    public function test_traveler_receives_the_request_received_email_when_sending_a_request(): void
    {
        Mail::fake();
        [$host, $accommodation, $room] = $this->makeRoom();
        $traveler = User::factory()->create(['email' => 'voyageur@example.com']);
        Sanctum::actingAs($traveler);

        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        Mail::assertSent(\App\Mail\BookingRequestReceived::class, fn ($m) => $m->hasTo('voyageur@example.com'));
    }

    public function test_corporate_deferred_payment_booking_skips_host_approval_and_has_no_expiry(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', array_merge($this->bookingPayload($room), [
            'traveler_type' => 'corporate',
            'deferred_payment' => true,
            'company_name' => 'ACME',
            'company_country' => "Côte d'Ivoire",
            'company_city' => 'Abidjan',
            'company_billing_email' => 'billing@acme.test',
        ]));
        $response->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(BookingStatus::Pending, $booking->status);
        $this->assertNull($booking->expires_at);
    }

    public function test_disabling_the_setting_restores_the_old_behavior(): void
    {
        Setting::set('host_approval_required', false, 'boolean');
        [$host, $accommodation, $room] = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room));
        $response->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(BookingStatus::Pending, $booking->status);
        $this->assertTrue($booking->expires_at->between(now()->addHours(47), now()->addHours(49)));
    }

    public function test_host_can_approve_availability_which_makes_the_booking_payable(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'awaiting_host_confirmation',
            'expires_at' => now()->addHours(24),
        ]);

        Sanctum::actingAs($host);
        $response = $this->postJson("/api/bookings/{$booking->id}/approve");
        $response->assertOk();

        $booking->refresh();
        $this->assertSame(BookingStatus::Pending, $booking->status);
        $this->assertTrue($booking->expires_at->between(now()->addHours(47), now()->addHours(49)));
        $this->assertNull($booking->confirmation_code, 'approve() ne doit pas générer le code — réservé au paiement');
    }

    public function test_a_host_of_another_accommodation_cannot_approve(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        $otherHost = User::factory()->create(['role' => 'host']);
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'awaiting_host_confirmation',
        ]);

        Sanctum::actingAs($otherHost);
        $this->postJson("/api/bookings/{$booking->id}/approve")->assertForbidden();
    }

    public function test_approving_a_booking_no_longer_awaiting_confirmation_is_rejected(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($host);
        $this->postJson("/api/bookings/{$booking->id}/approve")->assertStatus(422);
    }

    public function test_host_can_refuse_a_request_before_any_payment_with_no_credit(): void
    {
        Mail::fake();
        [$host, $accommodation, $room] = $this->makeRoom();
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'awaiting_host_confirmation',
            'amount_paid' => 0,
        ]);

        Sanctum::actingAs($host);
        $response = $this->postJson("/api/bookings/{$booking->id}/refuse", ['reason' => 'Indisponible']);
        $response->assertOk();

        $booking->refresh();
        $this->assertSame(BookingStatus::Cancelled, $booking->status);
        $this->assertSame(0.0, (float) $booking->refund_amount);
    }

    public function test_payment_cannot_be_initiated_while_awaiting_host_confirmation(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'awaiting_host_confirmation',
            'total_price' => 40000,
            'amount_paid' => 0,
        ]);

        Sanctum::actingAs($booking->user);
        $response = $this->postJson("/api/bookings/{$booking->id}/payment/initiate", [
            'payment_method' => 'wave-ci',
            'payment_type' => 'full',
        ]);

        $response->assertStatus(400);
    }

    public function test_payment_cannot_be_initiated_on_a_cancelled_booking(): void
    {
        // Bug corrigé le 2026-09-16 : $booking->status === 'cancelled' (chaîne)
        // contre un attribut casté en enum ne matchait jamais — une
        // réservation annulée restait payable si elle n'était pas expirée.
        [$host, $accommodation, $room] = $this->makeRoom();
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'cancelled',
            'total_price' => 40000,
            'amount_paid' => 0,
            'expires_at' => null,
        ]);

        Sanctum::actingAs($booking->user);
        $response = $this->postJson("/api/bookings/{$booking->id}/payment/initiate", [
            'payment_method' => 'wave-ci',
            'payment_type' => 'full',
        ]);

        $response->assertStatus(400);
    }

    private function makeRequest(Room $room, string $status = 'awaiting_host_confirmation'): Booking
    {
        return Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'status' => $status,
            'payment_status' => 'pending',
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'expires_at' => now()->addHours(24),
        ]);
    }

    // Retour client 2026-09-18 : une demande en attente ne bloque plus les
    // dates — l'hôte peut en recevoir plusieurs pour la même période.
    public function test_an_awaiting_host_confirmation_booking_does_not_block_another_traveler(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();
    }

    public function test_approving_one_request_automatically_cancels_the_other_pending_requests(): void
    {
        Bus::fake();
        Mail::fake();
        [$host, $accommodation, $room] = $this->makeRoom();
        $winner = $this->makeRequest($room);
        $loserA = $this->makeRequest($room);
        $loserB = $this->makeRequest($room);

        Sanctum::actingAs($host);
        $this->postJson("/api/bookings/{$winner->id}/approve")->assertOk();

        $this->assertSame(BookingStatus::Pending, $winner->fresh()->status);
        $this->assertSame(BookingStatus::Cancelled, $loserA->fresh()->status);
        $this->assertSame(BookingStatus::Cancelled, $loserB->fresh()->status);
    }

    public function test_host_cannot_approve_a_second_request_while_another_one_is_awaiting_payment(): void
    {
        Mail::fake();
        [$host, $accommodation, $room] = $this->makeRoom();
        $this->makeRequest($room, 'pending'); // déjà acceptée, en attente de paiement
        $other = $this->makeRequest($room);

        Sanctum::actingAs($host);
        $this->postJson("/api/bookings/{$other->id}/approve")->assertStatus(422);
        $this->assertSame(BookingStatus::AwaitingHostConfirmation, $other->fresh()->status);
    }

    public function test_confirming_a_paid_booking_cancels_remaining_competing_requests(): void
    {
        Bus::fake();
        Mail::fake();
        [$host, $accommodation, $room] = $this->makeRoom();
        $paying = $this->makeRequest($room, 'pending');
        $competitor = $this->makeRequest($room);

        app(\App\Services\BookingService::class)->confirm($paying);

        $this->assertSame(BookingStatus::Confirmed, $paying->fresh()->status);
        $this->assertSame(BookingStatus::Cancelled, $competitor->fresh()->status);
    }

    public function test_cancel_expired_bookings_notifies_the_traveler_when_host_never_responded(): void
    {
        Bus::fake();
        [$host, $accommodation, $room] = $this->makeRoom();
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'awaiting_host_confirmation',
            'payment_status' => 'pending',
            'expires_at' => now()->subHour(),
        ]);

        $this->artisan('bookings:cancel-expired');

        $booking->refresh();
        $this->assertSame(BookingStatus::Cancelled, $booking->status);
        Bus::assertDispatched(\App\Jobs\SendBookingCancellation::class, function ($job) use ($booking) {
            return $job->booking->id === $booking->id;
        });
    }

    public function test_remind_and_cancel_unpaid_bookings_ignores_awaiting_host_confirmation(): void
    {
        [$host, $accommodation, $room] = $this->makeRoom();
        // Ancienne (>2 jours) et proche de l'arrivée : tomberait dans les deux
        // requêtes de la commande si le filtre de statut n'était pas correct.
        $booking = Booking::factory()->for(User::factory()->create())->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'awaiting_host_confirmation',
            'payment_status' => 'pending',
            'check_in' => now()->addHours(12),
            'check_out' => now()->addDays(2),
            'created_at' => now()->subDays(3),
        ]);

        $this->artisan('bookings:remind-cancel-unpaid');

        $booking->refresh();
        $this->assertSame(BookingStatus::AwaitingHostConfirmation, $booking->status, 'ne doit pas être annulée par cette commande');
    }
}
