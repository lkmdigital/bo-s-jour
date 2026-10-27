<?php

namespace App\Console\Commands;

use App\Services\AiModule;
use App\Services\Ops\MegaBo\MegaBoReport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/** Mega Bo rédige le rapport du jour et, si l'envoi est activé (Ops > Alertes), l'envoie par WhatsApp et e-mail. */
class OpsMegaBoReport extends Command
{
    protected $signature = 'ops:mega-bo-report {--print : Affiche le rapport sans l\'envoyer} {--force-send : Envoie même si l\'envoi automatique est désactivé}';

    protected $description = 'Mega Bo : rédige et envoie le rapport quotidien.';

    public function handle(MegaBoReport $reports): int
    {
        if (!AiModule::configured()) {
            $this->warn('Mega Bo : clé API Anthropic absente, rapport non généré.');

            return self::FAILURE;
        }

        try {
            $report = $reports->generate();
        } catch (\Throwable $e) {
            Log::error('Mega Bo : rapport non généré', ['error' => $e->getMessage()]);
            $this->error('Rapport non généré : ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info($report->headline);
        $this->line($report->body);

        if ($this->option('print')) {
            return self::SUCCESS;
        }
        if (!$this->option('force-send') && !MegaBoReport::sendingEnabled()) {
            $this->line("\nEnvoi automatique désactivé : rapport enregistré, non envoyé.");

            return self::SUCCESS;
        }

        $sent = $reports->deliver($report);
        $this->line("\nEnvoyé : $sent message(s).");

        return self::SUCCESS;
    }
}
