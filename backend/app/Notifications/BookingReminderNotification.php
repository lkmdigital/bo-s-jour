<?php

namespace App\Notifications;

use App\Mail\BookingReminder;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BookingReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Booking $booking) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): BookingReminder
    {
        $amountDue = max(0, (float) $this->booking->total_price - (float) $this->booking->amount_paid);

        return new BookingReminder($this->booking, $amountDue);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'       => 'booking_reminder',
            'booking_id' => $this->booking->id,
            'message'    => "Rappel : arrivée demain pour la réservation #{$this->booking->confirmation_code}.",
            'check_in'   => $this->booking->check_in->toDateString(),
        ];
    }
}
