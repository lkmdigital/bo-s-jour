<?php

namespace App\Console\Commands;

use App\Services\Ops\Monitor\AlertService;
use App\Services\Ops\Monitor\DigestBuilder;
use Illuminate\Console\Command;

/** Résumé de la supervision envoyé chaque matin à 8 h (bilan de la semaine le lundi), même quand tout va bien. */
class OpsDigest extends Command
{
    protected $signature = 'ops:digest {--weekly : Force le bilan hebdomadaire} {--print : Affiche le résumé sans l\'envoyer}';

    protected $description = 'Supervision : envoie le résumé quotidien (bilan hebdomadaire le lundi).';

    public function handle(DigestBuilder $builder, AlertService $alerts): int
    {
        $weekly = $this->option('weekly') || now('Africa/Abidjan')->isMonday();
        $digest = $builder->build($weekly);

        if ($this->option('print')) {
            $this->line($digest['level'] . ' — ' . $digest['headline']);
            $this->line($digest['detail']);

            return self::SUCCESS;
        }

        if ($alerts->enabled()) {
            $alerts->notifyText('digest', $digest['level'], $digest['headline'], $digest['detail']);
        }

        return self::SUCCESS;
    }
}
