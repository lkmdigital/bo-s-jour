<?php

namespace App\Notifications;

use App\Mail\BookingCancelled;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BookingCancelledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Booking $booking,
        private string $reason = ''
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): BookingCancelled
    {
        return new BookingCancelled($this->booking, $this->reason ?: 'Non spécifiée');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'       => 'booking_cancelled',
            'booking_id' => $this->booking->id,
            'message'    => "Réservation #{$this->booking->confirmation_code} annulée.",
            'reason'     => $this->reason,
        ];
    }
}
