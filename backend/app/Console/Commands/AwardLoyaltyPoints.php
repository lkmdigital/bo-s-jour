<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\LoyaltyPointsTransaction;
use App\Models\Setting;
use App\Services\LoyaltyService;
use Illuminate\Console\Command;

/**
 * Attribue les points de fidélité aux voyageurs dont le séjour est terminé
 * (check_out + 1 jour), même critère que reviews:send-post-stay-links.
 * Le statut `completed` n'est jamais positionné automatiquement dans le code
 * actuel — voir Décision #4 du plan Programme de Fidélité.
 */
class AwardLoyaltyPoints extends Command
{
    protected $signature = 'loyalty:award-points {--dry-run : Ne pas attribuer les points ni enregistrer la date}';

    protected $description = 'Attribue les points de fidélité aux voyageurs dont le séjour est terminé';

    public function handle(LoyaltyService $loyaltyService): int
    {
        $dryRun = $this->option('dry-run');
        $pointsPerFcfa = (float) Setting::get('loyalty_points_per_fcfa', 1 / 1000);

        $bookings = Booking::where('status', 'confirmed')
            ->where('check_out', '<=', now()->subDay())
            ->whereNull('no_show_at')
            ->whereNull('loyalty_points_awarded_at')
            ->with('user')
            ->get();

        $awarded = 0;
        $skipped = 0;

        foreach ($bookings as $booking) {
            if (!$booking->user) {
                $skipped++;
                continue;
            }

            $points = (int) floor((float) $booking->total_price * $pointsPerFcfa);

            if ($points <= 0) {
                $booking->update(['loyalty_points_awarded_at' => now()]);
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $this->line("Attribuerait {$points} points à l'utilisateur #{$booking->user_id} pour la réservation #{$booking->id}");
                $awarded++;
                continue;
            }

            try {
                $isFirstBooking = !LoyaltyPointsTransaction::where('user_id', $booking->user_id)
                    ->where('type', LoyaltyPointsTransaction::TYPE_BOOKING_EARN)
                    ->exists();

                $loyaltyService->awardPoints(
                    $booking->user,
                    $points,
                    LoyaltyPointsTransaction::TYPE_BOOKING_EARN,
                    $booking,
                    "Points gagnés pour le séjour du {$booking->check_in?->format('d/m/Y')} au {$booking->check_out?->format('d/m/Y')}"
                );

                if ($isFirstBooking) {
                    $bonus = (int) Setting::get('loyalty_first_booking_bonus', 0);
                    if ($bonus > 0) {
                        $loyaltyService->awardPoints(
                            $booking->user,
                            $bonus,
                            LoyaltyPointsTransaction::TYPE_FIRST_BOOKING_BONUS,
                            $booking,
                            'Bonus de bienvenue pour votre première réservation'
                        );
                    }
                }

                $booking->update(['loyalty_points_awarded_at' => now()]);
                $awarded++;
            } catch (\Throwable $e) {
                \Log::error('Échec attribution points fidélité', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
                $skipped++;
            }
        }

        $this->info("Terminé. Réservations traitées : {$awarded}, ignorées : {$skipped}." . ($dryRun ? ' (dry-run)' : ''));
        return 0;
    }
}
