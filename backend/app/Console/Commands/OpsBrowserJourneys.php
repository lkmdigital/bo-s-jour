<?php

namespace App\Console\Commands;

use App\Services\Ops\Monitor\CheckRegistry;
use App\Services\Ops\Monitor\CheckResult;
use App\Services\Ops\Monitor\MonitorRunner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Process;

/**
 * Lance un parcours navigateur de la supervision (Playwright + Chromium, dossier monitor/) pour un profil,
 * enregistre son résultat (étapes, durées, capture d'écran en cas d'échec) puis supprime les données de test créées.
 */
class OpsBrowserJourneys extends Command
{
    protected $signature = 'ops:browser-journeys {profile : traveler, host ou admin} {--full : voyageur : va jusqu\'à la passerelle de paiement} {--no-cleanup : conserve les données de test}';

    protected $description = 'Supervision : exécute le parcours navigateur d\'un profil de test.';

    public function handle(CheckRegistry $registry, MonitorRunner $runner): int
    {
        $profile = (string) $this->argument('profile');
        if (!in_array($profile, ['traveler', 'host', 'admin'], true)) {
            $this->error('Profil inconnu : traveler, host ou admin.');

            return self::FAILURE;
        }

        $script = base_path("monitor/$profile.cjs");
        $check = $registry->all()["browser.$profile"];
        $shots = storage_path('app/ops-screenshots');
        @mkdir($shots, 0775, true);

        // Le parcours voyageur ne va jusqu'à la passerelle de paiement qu'une fois par heure (chaque ouverture
        // crée un paiement « en attente » chez MaliaPay) ; les autres passages s'arrêtent à la page de paiement.
        $full = $this->option('full') || ($profile === 'traveler' && (int) now()->format('i') < 15);

        $env = [
            'NODE_PATH' => (string) config('ops.playwright_path'),
            'OPS_BASE_URL' => (string) config('ops.site_url'),
            'OPS_API_URL' => (string) config('ops.api_url'),
            'OPS_MONITOR_SECRET' => (string) config('ops.monitor_secret'),
            'OPS_SHOT_DIR' => $shots,
            'OPS_FULL' => $full ? '1' : '0',
        ];
        foreach (['traveler' => 'TRAVELER', 'host' => 'HOST', 'admin' => 'ADMIN'] as $key => $upper) {
            $env["OPS_{$upper}_EMAIL"] = (string) config("ops.accounts.$key.email");
            $env["OPS_{$upper}_PASSWORD"] = (string) config("ops.accounts.$key.password");
        }

        $start = microtime(true);
        $process = Process::path(base_path('monitor'))->env($env)->timeout(240)->run([(string) config('ops.node_binary'), $script]);
        $durationMs = (int) round((microtime(true) - $start) * 1000);

        $result = $this->parse($process->output(), $process->errorOutput(), $process->exitCode());
        $result->durationMs = $durationMs;
        $runner->record($check, $result);

        if (!$this->option('no-cleanup')) {
            Artisan::call('ops:cleanup-synthetic', ['--minutes' => 0]);
        }
        $this->pruneScreenshots($shots);

        if ($this->output->isVerbose()) {
            $this->line(strtoupper($result->status) . ' — ' . $result->message);
        }

        return self::SUCCESS;
    }

    private function parse(string $stdout, string $stderr, ?int $exitCode): CheckResult
    {
        if (preg_match('/__OPS_RESULT__(\{.*\})\s*$/s', $stdout, $m) && is_array($report = json_decode($m[1], true))) {
            $details = array_filter([
                'étapes' => $report['steps'] ?? [],
                'erreurs_5xx' => $report['serverErrors'] ?? [],
                'erreurs_js' => $report['pageErrors'] ?? [],
                'données' => $report['data'] ?? [],
            ]);
            $screenshot = !empty($report['screenshot']) ? basename((string) $report['screenshot']) : null;

            return new CheckResult(in_array($report['status'] ?? '', ['ok', 'warn', 'fail'], true) ? $report['status'] : 'fail', (string) ($report['message'] ?? ''), $details, $screenshot);
        }

        // Pas de rapport : le moteur de parcours lui-même est indisponible (Node, Playwright, Chromium…).
        // Ce n'est pas une panne du site : avertissement visible dans le tableau de bord, sans alerte.
        $why = trim(mb_substr($stderr !== '' ? $stderr : $stdout, -400));

        return CheckResult::warn('Le moteur de parcours navigateur n\'a pas rendu de rapport (code ' . ($exitCode ?? '?') . ') : ' . $why);
    }

    /** Garde les 30 captures les plus récentes. */
    private function pruneScreenshots(string $dir): void
    {
        $files = glob($dir . '/*.png') ?: [];
        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        foreach (array_slice($files, 30) as $old) {
            @unlink($old);
        }
    }
}
