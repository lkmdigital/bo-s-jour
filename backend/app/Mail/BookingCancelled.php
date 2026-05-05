<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingCancelled extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;
    public $reason;

    /**
     * Create a new message instance.
     */
    public function __construct(Booking $booking, string $reason = 'Paiement non reçu')
    {
        $this->booking = $booking;
        $this->reason = $reason;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Réservation annulée #' . $this->booking->id)
                    ->view('emails.booking-cancelled')
                    ->with([
                        'booking' => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'user' => $this->booking->user,
                        'reason' => $this->reason,
                    ]);
    }
}



