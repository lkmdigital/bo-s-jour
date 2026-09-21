<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * L'hôte a confirmé la disponibilité — invite le voyageur à payer pour
 * finaliser sa réservation (retour client 2026-09-16, parcours "confirmation
 * hôte avant paiement"). Distincte de BookingConfirmation (paiement effectué).
 */
class BookingApprovedPleasePay extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;

    public function __construct(Booking $booking)
    {
        $this->booking = $booking;
    }

    public function build()
    {
        $frontend = rtrim(config('services.frontend_url', 'https://bosejour.ci'), '/');

        return $this->subject('Votre demande de réservation est acceptée — finalisez votre paiement')
                    ->view('emails.booking-approved-please-pay')
                    ->with([
                        'booking'       => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'room'          => $this->booking->room,
                        'paymentUrl'    => "{$frontend}/bookings/{$this->booking->access_token}/payment",
                    ]);
    }
}
