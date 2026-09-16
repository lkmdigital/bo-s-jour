<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Nouvelle DEMANDE de réservation — distincte de HostNewBooking (qui annonce
 * une réservation déjà confirmée). Invite l'hôte à confirmer la disponibilité
 * avant tout paiement (retour client 2026-09-16).
 */
class HostBookingRequest extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;

    public function __construct(Booking $booking)
    {
        $this->booking = $booking;
    }

    public function build()
    {
        return $this->subject('Nouvelle demande de réservation — à confirmer')
                    ->view('emails.host-booking-request')
                    ->with([
                        'booking'       => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'room'          => $this->booking->room,
                        'guest'         => $this->booking->user,
                    ]);
    }
}
