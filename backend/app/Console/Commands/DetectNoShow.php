<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Console\Command;

class DetectNoShow extends Command
{
    protected $signature = 'bookings:detect-no-show';

    protected $description = 'Détecte les No Show (réservations confirmées sans check-in après la date d\'arrivée) et applique la politique (l\'établissement conserve l\'acompte).';

    public function handle(BookingService $bookingService): int
    {
        // Réservations confirmées dont la date d'arrivée est passée (depuis > 1 jour),
        // sans check-in enregistré et pas encore marquées No Show.
        $threshold = now()->startOfDay()->subDay();

        $bookings = Booking::where('status', 'confirmed')
            ->whereNull('checked_in_at')
            ->whereNull('no_show_at')
            ->whereDate('check_in', '<=', $threshold)
            ->get();

        if ($bookings->isEmpty()) {
            $this->info('Aucun No Show à traiter.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($bookings as $booking) {
            try {
                $bookingService->markNoShow($booking, null);
                $count++;
            } catch (\Throwable $e) {
                $this->error("Booking #{$booking->id} : {$e->getMessage()}");
            }
        }

        $this->info("{$count} réservation(s) marquée(s) No Show.");
        return self::SUCCESS;
    }
}
