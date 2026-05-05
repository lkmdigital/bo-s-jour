<?php

namespace App\Console\Commands;

use App\Models\Commission;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanDuplicateCommissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'commissions:clean-duplicates 
                            {--dry-run : Afficher les doublons sans les supprimer}
                            {--force : Forcer la suppression sans confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Nettoyer les commissions en double pour éviter les surpaiements aux hôtes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');

        $this->info('Recherche des commissions en double...');

        // Trouver les réservations avec plusieurs commissions
        $duplicates = DB::table('commissions')
            ->select('booking_id', DB::raw('COUNT(*) as count'))
            ->groupBy('booking_id')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('✓ Aucune commission en double trouvée.');
            return 0;
        }

        $this->warn("⚠ Trouvé {$duplicates->count()} réservation(s) avec des commissions en double.");

        $totalToDelete = 0;
        $totalAmountToRecover = 0;

        foreach ($duplicates as $duplicate) {
            $bookingId = $duplicate->booking_id;
            $commissions = Commission::where('booking_id', $bookingId)
                ->orderBy('created_at', 'desc')
                ->get();

            // Garder la commission la plus récente
            $keepCommission = $commissions->first();
            $toDelete = $commissions->skip(1);

            $this->line("\nRéservation #{$bookingId}:");
            $this->line("  - Commissions trouvées: {$commissions->count()}");
            $this->line("  - À conserver: Commission #{$keepCommission->id} (créée le {$keepCommission->created_at})");
            $this->line("  - Montant de la commission conservée: " . number_format($keepCommission->commission_amount, 2) . " FCFA");
            $this->line("  - Montant pour l'hôte conservé: " . number_format($keepCommission->host_amount, 2) . " FCFA");

            foreach ($toDelete as $commission) {
                $totalToDelete++;
                $totalAmountToRecover += $commission->host_amount;
                
                $this->warn("  - À supprimer: Commission #{$commission->id} (créée le {$commission->created_at})");
                $this->warn("    Montant: " . number_format($commission->host_amount, 2) . " FCFA");
                
                if ($commission->status === 'paid') {
                    $this->error("    ⚠ ATTENTION: Cette commission est déjà payée!");
                }
            }
        }

        $this->line("\n" . str_repeat('=', 60));
        $this->info("Résumé:");
        $this->info("  - Réservations avec doublons: {$duplicates->count()}");
        $this->info("  - Commissions à supprimer: {$totalToDelete}");
        $this->info("  - Montant total à récupérer: " . number_format($totalAmountToRecover, 2) . " FCFA");

        if ($dryRun) {
            $this->info("\n✓ Mode dry-run activé. Aucune suppression effectuée.");
            return 0;
        }

        if (!$force) {
            if (!$this->confirm("\nVoulez-vous supprimer ces commissions en double?", true)) {
                $this->info('Opération annulée.');
                return 0;
            }
        }

        $this->info("\nSuppression des commissions en double...");

        $deleted = 0;
        foreach ($duplicates as $duplicate) {
            $bookingId = $duplicate->booking_id;
            $commissions = Commission::where('booking_id', $bookingId)
                ->orderBy('created_at', 'desc')
                ->get();

            // Garder la commission la plus récente
            $keepCommission = $commissions->first();
            $toDelete = $commissions->skip(1);

            foreach ($toDelete as $commission) {
                if ($commission->status === 'paid') {
                    $this->warn("⚠ Commission #{$commission->id} déjà payée - vérification manuelle requise");
                    continue;
                }
                
                $commission->delete();
                $deleted++;
            }
        }

        $this->info("✓ {$deleted} commission(s) supprimée(s) avec succès.");

        if ($deleted < $totalToDelete) {
            $this->warn("⚠ Certaines commissions n'ont pas été supprimées car elles sont déjà payées.");
            $this->warn("  Veuillez les vérifier manuellement.");
        }

        return 0;
    }
}







