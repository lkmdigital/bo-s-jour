<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\RoomAvailability;
use App\Services\CancellationPolicyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelExpiredBookings extends Command
{
    protected $signature = 'bookings:cancel-expired';

    protected $description = 'Annule automatiquement les réservations non soldées après 48h et libère les disponibilités';

    public function handle(): int
    {
        $now = now();

        $bookings = Booking::where('status', '!=', 'cancelled')
            ->where('payment_status', '!=', 'paid')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->get();

        if ($bookings->isEmpty()) {
            $this->info('Aucune réservation expirée à annuler.');
            return self::SUCCESS;
        }

        $cancelled = 0;

        foreach ($bookings as $booking) {
            DB::transaction(function () use ($booking, &$cancelled) {
                $booking->update([
                    'status' => 'cancelled',
                    'payment_status' => 'cancelled',
                ]);

                CancellationPolicyService::onBookingCancelled($booking);

                if ($booking->room_id) {
                    $dates = $this->getDatesBetween($booking->check_in, $booking->check_out);
                    if (!empty($dates)) {
                        RoomAvailability::where('room_id', $booking->room_id)
                            ->whereIn('date', $dates)
                            ->update(['status' => 'available']);
                    }
                }

                \Log::info('Booking auto-cancelled after 48h without full payment', [
                    'booking_id' => $booking->id,
                    'user_id' => $booking->user_id,
                    'amount_paid' => $booking->amount_paid,
                    'total_price' => $booking->total_price,
                ]);

                $cancelled++;
            });
        }

        $this->info("{$cancelled} réservation(s) ont été annulées pour non-paiement.");

        return self::SUCCESS;
    }

    private function getDatesBetween($start, $end): array
    {
        $dates = [];
        $current = strtotime($start);
        $endTime = strtotime($end);

        while ($current < $endTime) {
            $dates[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        return $dates;
    }
}

