<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\BookingHistory;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.4) : "Modifiée" fait partie des statuts
 * de réservation proposés. Une réservation garde son statut principal
 * (pending/confirmed/cancelled/completed) inchangé — "Modifiée" est un
 * indicateur affiché à côté, jamais un remplacement.
 */
class BookingWasModifiedTest extends TestCase
{
    use RefreshDatabase;

    private function makeConfirmedBooking(): Booking
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);
        $room = Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 4,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);
        return Booking::factory()->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'confirmed',
            'guests' => 2,
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12),
        ]);
    }

    public function test_a_fresh_booking_is_not_marked_as_modified(): void
    {
        $booking = $this->makeConfirmedBooking();

        // fresh() : create() ne rapatrie pas les valeurs par défaut posées
        // côté base (was_modified n'est jamais passé explicitement ici) —
        // seule une relecture reflète la vraie valeur stockée.
        $this->assertFalse($booking->fresh()->was_modified);
    }

    public function test_modifying_dates_sets_was_modified_without_changing_the_status(): void
    {
        $booking = $this->makeConfirmedBooking();
        Sanctum::actingAs($booking->user);

        $this->putJson("/api/bookings/{$booking->id}", [
            'check_in' => now()->addDays(15)->toDateString(),
            'check_out' => now()->addDays(17)->toDateString(),
        ])->assertOk()->assertJsonPath('was_modified', true)->assertJsonPath('status', 'confirmed');
    }

    public function test_modifying_guests_sets_was_modified_and_logs_history(): void
    {
        $booking = $this->makeConfirmedBooking();
        Sanctum::actingAs($booking->user);

        $this->putJson("/api/bookings/{$booking->id}", ['guests' => 3])
            ->assertOk()
            ->assertJsonPath('was_modified', true);

        $this->assertTrue(
            BookingHistory::where('booking_id', $booking->id)->where('action', 'modified')->exists()
        );
    }

    public function test_assigning_a_room_number_alone_does_not_mark_the_booking_as_modified(): void
    {
        $booking = $this->makeConfirmedBooking();
        $host = User::factory()->create(['role' => 'host']);
        \App\Models\Accommodation::where('id', $booking->accommodation_id)->update(['host_id' => $host->id]);
        Sanctum::actingAs($host);

        $this->putJson("/api/bookings/{$booking->id}", ['assigned_room_number' => '204'])->assertOk();

        $this->assertFalse($booking->fresh()->was_modified);
    }
}
