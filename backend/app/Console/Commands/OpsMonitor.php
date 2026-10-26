<?php

namespace App\Console\Commands;

use App\Services\Ops\Monitor\CheckRegistry;
use App\Services\Ops\Monitor\MonitorRunner;
use Illuminate\Console\Command;

class OpsMonitor extends Command
{
    protected $signature = 'ops:monitor {--only=* : Clés des contrôles à exécuter} {--force : Ignore la fréquence et exécute tout de suite}';

    protected $description = 'Supervision : exécute les contrôles arrivés à échéance (site, API, parcours, serveur, journaux, anomalies métier).';

    public function handle(MonitorRunner $runner, CheckRegistry $registry): int
    {
        $only = $this->option('only') ?: null;
        $results = $runner->run($only, (bool) $this->option('force'));

        if ($this->output->isVerbose() || $only) {
            $this->table(['Contrôle', 'Statut', 'ms', 'Message'], collect($results)->map(fn ($r) => [$r->check_key, strtoupper($r->status), $r->duration_ms, mb_substr((string) $r->message, 0, 90)])->all());
        }

        return self::SUCCESS;
    }
}
