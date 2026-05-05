<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingReminder extends Mailable
{
    use Queueable, SerializesModels;

    public $booking;
    public $amountDue;

    /**
     * Create a new message instance.
     */
    public function __construct(Booking $booking, float $amountDue)
    {
        $this->booking = $booking;
        $this->amountDue = $amountDue;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Rappel : Soldez votre réservation #' . $this->booking->id)
                    ->view('emails.booking-reminder')
                    ->with([
                        'booking' => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'user' => $this->booking->user,
                        'amountDue' => $this->amountDue,
                    ]);
    }
}



