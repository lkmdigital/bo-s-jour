<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Bug corrigé le 2026-09-16 : AnalyticsController::travelerDashboard()
 * comparait `$booking->status === 'confirmed'` (chaîne) à un attribut casté
 * en enum BookingStatus — toujours false en PHP (=== compare aussi le
 * type), donc upcoming_bookings et past_bookings étaient systématiquement
 * vides, même quand des réservations confirmées existaient (même bug que
 * celui corrigé le 2026-09-15 dans PaymentController::updateBookingPaymentState()).
 */
class AnalyticsTravelerDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_traveler_dashboard_returns_confirmed_bookings_in_the_right_bucket(): void
    {
        $traveler = User::factory()->create();
        $accommodation = Accommodation::factory()->create(['status' => 'published']);

        $upcoming = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'status' => 'confirmed',
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12),
        ]);

        $past = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'status' => 'confirmed',
            'check_in' => now()->subDays(12),
            'check_out' => now()->subDays(10),
        ]);

        // Réservation en attente : ne doit apparaître dans aucun des deux blocs.
        Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'status' => 'pending',
            'check_in' => now()->addDays(5),
            'check_out' => now()->addDays(7),
        ]);

        Sanctum::actingAs($traveler);

        $response = $this->getJson('/api/analytics/traveler');

        $response->assertOk();
        $response->assertJsonPath('upcoming_bookings.0.id', $upcoming->id);
        $response->assertJsonPath('past_bookings.0.id', $past->id);
        $this->assertCount(1, $response->json('upcoming_bookings'));
        $this->assertCount(1, $response->json('past_bookings'));
    }
}
