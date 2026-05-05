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
        $host = $this->booking->accommodation->host;
        
        return $this->subject('Nouvelle réservation - ' . $this->booking->accommodation->name)
                    ->view('emails.host-new-booking')
                    ->to($host->email)
                    ->with([
                        'booking' => $this->booking,
                        'accommodation' => $this->booking->accommodation,
                        'guest' => $this->booking->user,
                    ]);
    }
}



