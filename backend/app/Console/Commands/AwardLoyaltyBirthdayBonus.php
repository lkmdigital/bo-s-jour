<?php

namespace App\Console\Commands;

use App\Models\LoyaltyPointsTransaction;
use App\Models\Setting;
use App\Models\User;
use App\Services\LoyaltyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Bonus d'anniversaire (brief Programme de Fidélité) : crédité une fois par an
 * aux voyageurs dont c'est l'anniversaire aujourd'hui. Idempotent sans colonne
 * dédiée — vérifie qu'aucune transaction "birthday_bonus" n'existe déjà pour
 * cette même année civile, plutôt qu'un simple whereNull comme les autres
 * commandes planifiées (celle-ci doit se redéclencher chaque année).
 */
class AwardLoyaltyBirthdayBonus extends Command
{
    protected $signature = 'loyalty:award-birthday-bonus {--dry-run : Ne pas attribuer les points}';

    protected $description = "Attribue le bonus d'anniversaire aux voyageurs dont c'est l'anniversaire aujourd'hui";

    public function handle(LoyaltyService $loyaltyService): int
    {
        $dryRun = $this->option('dry-run');
        $bonus = (int) Setting::get('loyalty_birthday_bonus', 50);

        if ($bonus <= 0) {
            $this->info('Bonus anniversaire désactivé (montant à 0).');
            return 0;
        }

        $today = now();
        $users = User::whereNotNull('date_of_birth')
            ->whereRaw('MONTH(date_of_birth) = ?', [$today->month])
            ->whereRaw('DAY(date_of_birth) = ?', [$today->day])
            ->get();

        $awarded = 0;
        $skipped = 0;

        foreach ($users as $user) {
            $alreadyAwardedThisYear = LoyaltyPointsTransaction::where('user_id', $user->id)
                ->where('type', LoyaltyPointsTransaction::TYPE_BIRTHDAY_BONUS)
                ->whereYear('created_at', $today->year)
                ->exists();

            if ($alreadyAwardedThisYear) {
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $this->line("Attribuerait {$bonus} points à l'utilisateur #{$user->id} (anniversaire)");
                $awarded++;
                continue;
            }

            try {
                DB::transaction(function () use ($loyaltyService, $user, $bonus) {
                    $loyaltyService->awardPoints(
                        $user,
                        $bonus,
                        LoyaltyPointsTransaction::TYPE_BIRTHDAY_BONUS,
                        null,
                        "Joyeux anniversaire ! +{$bonus} points de fidélité"
                    );
                });
                $awarded++;
            } catch (\Throwable $e) {
                \Log::error('Échec bonus anniversaire fidélité', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
                $skipped++;
            }
        }

        $this->info("Terminé. Anniversaires traités : {$awarded}, ignorés : {$skipped}." . ($dryRun ? ' (dry-run)' : ''));
        return 0;
    }
}
