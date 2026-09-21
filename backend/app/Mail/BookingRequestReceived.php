<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Accusé de réception envoyé au voyageur dès qu'il a envoyé sa demande de
 * réservation (texte fourni par le client, 2026-09-21). Distinct de
 * BookingApprovedPleasePay (partenaire a validé) et de BookingConfirmation
 * (paiement effectué).
 */
class BookingRequestReceived extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;

    public function __construct(Booking $booking)
    {
        $this->booking = $booking;
    }

    public function build()
    {
        return $this->subject('Votre demande de réservation a bien été enregistrée')
                    ->view('emails.booking-request-received')
                    ->with([
                        'booking'       => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'room'          => $this->booking->room,
                    ]);
    }
}
