<?php

namespace App\Console\Commands;

use App\Models\CorporateAnnualReward;
use App\Models\CorporateCollaborator;
use App\Models\User;
use App\Services\CorporateLoyaltyService;
use Illuminate\Console\Command;

/**
 * Calcule et fige, pour chaque entreprise (compte voyageur Corporate
 * responsable), le CA de l'année écoulée et la récompense de palier
 * correspondante (doc client §12). Prévue en planification annuelle — un
 * "propriétaire" est un utilisateur traveler_type=corporate qui n'est pas
 * lui-même collaborateur actif d'une autre entreprise (même règle que
 * CorporateController::overview).
 */
class ComputeCorporateAnnualRewards extends Command
{
    protected $signature = 'corporate:compute-annual-rewards
        {--year= : Année à figer (par défaut, l\'année civile précédente)}
        {--force : Recalcule et écrase une année déjà figée}
        {--dry-run : Affiche le résultat sans rien écrire}';

    protected $description = "Calcule et fige le palier de récompense Corporate de l'année écoulée pour chaque entreprise";

    public function handle(CorporateLoyaltyService $corporateLoyaltyService): int
    {
        $year = (int) ($this->option('year') ?: now()->subYear()->year);
        $force = (bool) $this->option('force');
        $dryRun = (bool) $this->option('dry-run');

        $collaboratorUserIds = CorporateCollaborator::where('status', CorporateCollaborator::STATUS_ACTIVE)
            ->whereNotNull('collaborator_user_id')
            ->pluck('collaborator_user_id');

        $owners = User::where('traveler_type', 'corporate')
            ->whereNotIn('id', $collaboratorUserIds)
            ->get();

        $frozen = 0;
        $skipped = 0;

        foreach ($owners as $owner) {
            $alreadyFrozen = CorporateAnnualReward::where('owner_id', $owner->id)
                ->where('year', $year)
                ->exists();

            if ($alreadyFrozen && !$force) {
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $revenue = $corporateLoyaltyService->computeAnnualRevenue($owner, $year);
                $tier = $corporateLoyaltyService->determineRewardTier($revenue);
                $this->line(
                    "Entreprise #{$owner->id} ({$owner->company_name}) — CA {$year} : "
                    . number_format($revenue, 0, ',', ' ') . ' FCFA → '
                    . ($tier?->reward_label ?? 'aucun palier atteint')
                );
                $frozen++;
                continue;
            }

            $corporateLoyaltyService->freezeYearReward($owner, $year);
            $frozen++;
        }

        $this->info(
            "Terminé. Entreprises traitées : {$frozen}, déjà figées (ignorées) : {$skipped}."
            . ($dryRun ? ' (dry-run)' : '')
        );

        return 0;
    }
}
