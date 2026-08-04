<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class HostNewBooking extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;

    /**
     * Create a new message instance.
     */
    public function __construct(Booking $booking)
    {
        $this->booking = $booking;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $code = $this->booking->confirmation_code ?? '#' . $this->booking->id;

        return $this->subject('Nouvelle réservation reçue — ' . $code)
                    ->view('emails.host-new-booking')
                    ->with([
                        'booking'       => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'room'          => $this->booking->room,
                        'guest'         => $this->booking->user,
                    ]);
    }
}



