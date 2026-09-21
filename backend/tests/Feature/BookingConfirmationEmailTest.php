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

        $this->assertStringContainsString("https://bosejour.ci/bookings/{$booking->access_token}", $html);
        $this->assertStringContainsString('Voir ma réservation', $html);
    }

    public function test_email_carries_the_payment_receipt_as_a_pdf_attachment(): void
    {
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'accommodation_id' => Accommodation::factory()->create()->id,
            'booking_number' => 'BS-2026-000043',
            'total_price' => 10000,
            'payment_type' => 'full',
            'payment_status' => 'paid',
        ]);
        \App\Models\Payment::create([
            'booking_id' => $booking->id, 'user_id' => $traveler->id, 'amount' => 9500, 'status' => 'completed',
            'purpose' => 'deposit', 'payment_method' => 'wave-ci', 'paid_at' => now(),
        ]);

        $mail = new BookingConfirmation($booking);
        $mail->build();

        $this->assertCount(1, $mail->rawAttachments);
        $this->assertSame('application/pdf', $mail->rawAttachments[0]['options']['mime']);
        $this->assertStringStartsWith('%PDF', $mail->rawAttachments[0]['data']);
    }
}
