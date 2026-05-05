<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Notifications\BookingReminderNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendBookingReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public Booking $booking) {}

    public function handle(): void
    {
        // Ne pas envoyer si la réservation a été annulée entre temps
        if ($this->booking->status->isTerminal()) {
            return;
        }

        $this->booking->user?->notify(new BookingReminderNotification($this->booking));
    }
}
