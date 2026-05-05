<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Notifications\BookingConfirmedNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendBookingConfirmation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 60; // secondes entre chaque retry

    public function __construct(public Booking $booking) {}

    public function handle(): void
    {
        $this->booking->user?->notify(new BookingConfirmedNotification($this->booking));
    }
}
