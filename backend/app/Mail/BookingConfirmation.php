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
        return $this->subject('Confirmation de réservation #' . $this->booking->id)
                    ->view('emails.booking-confirmation')
                    ->with([
                        'booking' => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'user' => $this->booking->user,
                    ]);
    }
}



