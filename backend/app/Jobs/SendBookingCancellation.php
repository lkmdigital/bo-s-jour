<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Models\NotificationLog;
use App\Notifications\BookingCancelledNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendBookingCancellation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 60;

    public function __construct(
        public Booking $booking,
        public string $reason = ''
    ) {}

    public function handle(): void
    {
        try {
            $this->booking->user?->notify(
                new BookingCancelledNotification($this->booking, $this->reason)
            );
            // "Événements de notification" (retour client 2026-09-02, Partie 4.3).
            NotificationLog::record($this->booking->id, 'booking_cancelled', 'email', 'traveler', $this->booking->user?->email, true);
        } catch (\Throwable $e) {
            NotificationLog::record($this->booking->id, 'booking_cancelled', 'email', 'traveler', $this->booking->user?->email, false, $e->getMessage());
            throw $e; // laisser le job retry normalement
        }
    }
}
