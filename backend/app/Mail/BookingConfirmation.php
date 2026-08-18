<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingConfirmation extends Mailable
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
        $reference = $this->booking->booking_number ?? $this->booking->confirmation_code ?? '#' . $this->booking->id;

        return $this->subject('Votre réservation Bosejour est confirmée — ' . $reference)
                    ->view('emails.booking-confirmation')
                    ->with([
                        'booking'       => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'room'          => $this->booking->room,
                        'user'          => $this->booking->user,
                    ]);
    }
}



