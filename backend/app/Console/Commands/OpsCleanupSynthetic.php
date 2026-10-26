<?php

namespace App\Console\Commands;

use App\Models\Ops\OpsAlert;
use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Nettoyage de la supervision : supprime les réservations et paiements créés par les comptes de test (les
 * parcours les annulent eux-mêmes, ceci rattrape les restes), purge leurs jetons, et supprime les anciens résultats.
 */
class OpsCleanupSynthetic extends Command
{
    protected $signature = 'ops:cleanup-synthetic {--minutes=10 : Ne touche qu\'aux données de test plus anciennes que N minutes}';

    protected $description = 'Supervision : supprime les réservations de test, anciens jetons et anciens résultats.';

    public function handle(): int
    {
        $syntheticIds = DB::table('users')->where('is_synthetic', true)->pluck('id');
        $cutoff = now()->subMinutes((int) $this->option('minutes'));
        $bookings = 0;

        if ($syntheticIds->isNotEmpty()) {
            // Les paiements et lignes liées sont supprimés en cascade par la base.
            $bookings = DB::table('bookings')->whereIn('user_id', $syntheticIds)->where('created_at', '<', $cutoff)->delete();
            DB::table('personal_access_tokens')->where('tokenable_type', 'App\\Models\\User')->whereIn('tokenable_id', $syntheticIds)->where('created_at', '<', now()->subHour())->delete();
            if (DB::getSchemaBuilder()->hasTable('notifications')) {
                DB::table('notifications')->where('notifiable_type', 'App\\Models\\User')->whereIn('notifiable_id', $syntheticIds)->where('created_at', '<', now()->subDay())->delete();
            }
        }

        $days = (int) config('ops.result_retention_days');
        $results = OpsCheckResult::where('created_at', '<', now()->subDays($days))->delete();
        $incidents = OpsIncident::where('status', 'resolved')->where('resolved_at', '<', now()->subDays(90))->delete();
        $alerts = OpsAlert::where('created_at', '<', now()->subDays(90))->delete();

        if ($this->output->isVerbose()) {
            $this->info("Réservations de test supprimées : $bookings ; résultats purgés : $results ; incidents : $incidents ; alertes : $alerts");
        }

        return self::SUCCESS;
    }
}
