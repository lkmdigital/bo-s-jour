<?php

namespace Tests\Feature;

use App\Mail\BookingConfirmation;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.6) : l'e-mail de confirmation doit
 * inclure "un lien de consultation" — absent jusqu'ici (seul un lien
 * générique vers bosejour.ci figurait dans l'e-mail).
 */
class BookingConfirmationEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_contains_a_direct_link_to_the_booking(): void
    {
        config(['services.frontend_url' => 'https://bosejour.ci']);

        $traveler = User::factory()->create();
        $accommodation = Accommodation::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'booking_number' => 'BS-2026-000042',
        ]);

        $html = (new BookingConfirmation($booking))->render();

        $this->assertStringContainsString("https://bosejour.ci/bookings/{$booking->id}", $html);
        $this->assertStringContainsString('Voir ma réservation', $html);
    }
}
