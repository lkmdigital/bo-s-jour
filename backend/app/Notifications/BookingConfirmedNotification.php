<?php

namespace App\Notifications;

use App\Mail\BookingConfirmation;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BookingConfirmedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Booking $booking) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): BookingConfirmation
    {
        return new BookingConfirmation($this->booking);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'       => 'booking_confirmed',
            'booking_id' => $this->booking->id,
            'code'       => $this->booking->confirmation_code,
            'message'    => "Réservation #{$this->booking->confirmation_code} confirmée.",
            'check_in'   => $this->booking->check_in->toDateString(),
            'check_out'  => $this->booking->check_out->toDateString(),
        ];
    }
}
