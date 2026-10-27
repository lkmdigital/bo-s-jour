<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Models\Ops\OpsAlert;
use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;
use App\Models\Setting;
use App\Services\Ops\Monitor\AlertService;
use App\Services\Ops\Monitor\CheckRegistry;
use App\Services\Ops\Monitor\LogErrorScanner;
use App\Services\Ops\Monitor\MonitorRunner;
use Illuminate\Http\Request;

/** Supervision : état des contrôles par profil, incidents, erreurs regroupées et réglages d'alerte. */
class MonitoringController extends Controller
{
    private const PROFILES = [
        'system' => 'Plateforme et serveur',
        'traveler' => 'Voyageur',
        'host' => 'Partenaire',
        'admin' => 'Administrateur',
    ];

    public function index(CheckRegistry $registry)
    {
        $checks = $registry->all();
        $latest = [];
        $history = [];
        foreach (array_keys($checks) as $key) {
            $rows = OpsCheckResult::where('check_key', $key)->orderByDesc('id')->limit(24)->get();
            $latest[$key] = $rows->first();
            $history[$key] = $rows->reverse()->pluck('status')->all();
        }

        $open = OpsIncident::where('status', 'open')->orderByRaw("CASE severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 ELSE 3 END")->orderByDesc('first_seen_at')->get();
        $lastRun = MonitorRunner::lastRunAt();
        $stale = !$lastRun || now()->timestamp - $lastRun > 300;

        $global = $open->contains('severity', 'critical') ? 'critical' : ($open->isNotEmpty() ? 'degraded' : 'ok');
        if ($stale) {
            $global = 'stale';
        }

        $byProfile = [];
        foreach ($checks as $key => $check) {
            $byProfile[$check->profile][] = $check;
        }

        return view('ops.monitoring.index', [
            'profiles' => self::PROFILES,
            'byProfile' => $byProfile,
            'latest' => $latest,
            'history' => $history,
            'open' => $open,
            'global' => $global,
            'lastRun' => $lastRun ? \Carbon\Carbon::createFromTimestamp($lastRun) : null,
        ]);
    }

    public function incidents(Request $request)
    {
        $status = $request->query('status');
        $incidents = OpsIncident::query()
            ->when(in_array($status, ['open', 'resolved'], true), fn ($q) => $q->where('status', $status))
            ->orderByDesc('first_seen_at')
            ->paginate(25)
            ->withQueryString();

        return view('ops.monitoring.incidents', ['incidents' => $incidents, 'status' => $status]);
    }

    public function errors(Request $request)
    {
        $minutes = (int) $request->query('minutes', 360);
        $minutes = in_array($minutes, [60, 360, 1440, 4320], true) ? $minutes : 360;
        $withWarnings = $request->boolean('warnings');
        $levels = $withWarnings ? ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY', 'WARNING'] : ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'];

        return view('ops.monitoring.errors', [
            'groups' => (new LogErrorScanner())->scan($minutes, $levels),
            'minutes' => $minutes,
            'withWarnings' => $withWarnings,
        ]);
    }

    public function settings(AlertService $alerts)
    {
        return view('ops.monitoring.settings', [
            'enabled' => $alerts->enabled(),
            'megaBoReport' => \App\Services\Ops\MegaBo\MegaBoReport::sendingEnabled(),
            'megaBoTemplate' => \App\Services\Ops\MegaBo\MegaBoReport::TEMPLATE,
            'phones' => implode("\n", $alerts->phones()),
            'emails' => implode("\n", $alerts->emails()),
            'heartbeatUrl' => config('ops.heartbeat_token') ? url('/ops/heartbeat/' . config('ops.heartbeat_token')) : null,
            'recent' => OpsAlert::orderByDesc('id')->limit(15)->get(),
            'template' => AlertService::TEMPLATE,
        ]);
    }

    public function saveSettings(Request $request)
    {
        $data = $request->validate([
            'enabled' => 'nullable|boolean',
            'mega_bo_report' => 'nullable|boolean',
            'phones' => 'nullable|string|max:500',
            'emails' => 'nullable|string|max:500',
        ]);

        Setting::set('ops_alerts_enabled', (bool) ($data['enabled'] ?? false), 'boolean', 'Supervision : alertes activées');
        Setting::set('mega_bo_report_enabled', (bool) ($data['mega_bo_report'] ?? false), 'boolean', 'Mega Bo : rapport quotidien envoyé');
        Setting::set('ops_alert_phones', (string) ($data['phones'] ?? ''), 'string', 'Supervision : numéros WhatsApp alertés');
        Setting::set('ops_alert_emails', (string) ($data['emails'] ?? ''), 'string', 'Supervision : e-mails alertés');

        return redirect()->route('ops.monitoring.settings')->with('ops_success', 'Réglages d\'alerte enregistrés.');
    }

    public function testAlert(AlertService $alerts)
    {
        if (!$alerts->phones() && !$alerts->emails()) {
            return redirect()->route('ops.monitoring.settings')->with('ops_error', 'Ajoutez d\'abord un numéro ou une adresse e-mail.');
        }
        $alerts->notifyText('test', 'TEST', 'Test d\'alerte de la supervision', 'Si vous lisez ce message, les alertes de la supervision boséjour arrivent bien jusqu\'à vous.');

        return redirect()->route('ops.monitoring.settings')->with('ops_success', 'Alerte de test envoyée : consultez l\'historique ci-dessous.');
    }

    public function runNow(MonitorRunner $runner)
    {
        $results = $runner->run(null, true);

        return redirect()->route('ops.monitoring.index')->with('ops_success', count($results) . ' contrôles exécutés.');
    }

    /** Capture d'écran d'un échec de parcours navigateur (stockée hors du disque public, réservée aux administrateurs). */
    public function screenshot(string $path)
    {
        $file = storage_path('app/ops-screenshots/' . basename($path));
        abort_unless(preg_match('/^[\w.-]+\.png$/', basename($path)) && is_file($file), 404);

        return response()->file($file, ['Content-Type' => 'image/png', 'Cache-Control' => 'private, max-age=300']);
    }

    /** Signal de vie pour un service externe : 200 si le moniteur a tourné il y a moins de 5 min, sinon 503. */
    public function heartbeat(string $token)
    {
        $expected = (string) config('ops.heartbeat_token');
        if ($expected === '' || !hash_equals($expected, $token)) {
            abort(404);
        }
        $last = MonitorRunner::lastRunAt();
        $age = $last ? now()->timestamp - $last : null;
        $ok = $age !== null && $age <= 300;

        return response()->json(['ok' => $ok, 'last_run_seconds_ago' => $age], $ok ? 200 : 503);
    }
}
