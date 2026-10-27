<?php

namespace App\Services\Ops\MegaBo;

use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;
use App\Services\Ops\AudienceReport;
use App\Services\Ops\Monitor\LogErrorScanner;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Ce que Mega Bo a le droit de voir : des totaux et des tendances, jamais une donnée de client (ni nom, ni
 * numéro, ni e-mail, ni document). Tout texte qui vient de l'extérieur (chemins de pages, sites de provenance,
 * messages d'erreur) est nettoyé avant d'être transmis, car un visiteur peut y glisser ce qu'il veut.
 * Aucune méthode n'écrit quoi que ce soit.
 */
class MegaBoData
{
    public function __construct(private AudienceReport $audience = new AudienceReport(), private LogErrorScanner $logs = new LogErrorScanner()) {}

    /** Visiteurs, pages vues, évolution, pages et sources principales, appareils. */
    public function audience(string $period = '7d'): array
    {
        $r = $this->audience->build($period);
        $firstDay = DB::table('ops_visits')->min('day');
        $daysWithData = DB::table('ops_visits')->whereBetween('day', [$r['start']->toDateString(), $r['end']->toDateString()])->distinct()->count('day');

        return [
            'period' => $period,
            'from' => $r['start']->toDateString(),
            'to' => $r['end']->toDateString(),
            'visitors' => $r['current']['visitors'],
            'page_views' => $r['current']['views'],
            'pages_per_visitor' => $r['current']['per_visitor'],
            'previous_period' => ['visitors' => $r['previous']['visitors'], 'page_views' => $r['previous']['views']],
            'change_percent' => $r['change'],
            'visitors_right_now' => $r['live'],
            'daily' => array_map(fn ($d) => ['day' => $d['day'], 'visitors' => $d['visitors'], 'page_views' => $d['views']], array_slice($r['daily'], -14)),
            'top_pages' => $r['top_pages']->map(fn ($p) => ['page' => $this->cleanPath((string) $p->path), 'page_views' => (int) $p->views, 'visitors' => (int) $p->visitors])->all(),
            'sources' => array_map(fn ($s) => ['source' => $this->cleanHost((string) $s['label']), 'share_percent' => $s['share']], $r['referrers']),
            'devices' => array_map(fn ($s) => ['device' => $s['label'], 'share_percent' => $s['share']], $r['devices']),
            'days_with_data' => $daysWithData,
            'measurement_started' => $firstDay ? substr((string) $firstDay, 0, 10) : null,
            'note' => 'Un visiteur revenu un autre jour compte à nouveau. Les robots, la supervision et les espaces connectés ne sont pas comptés.',
        ];
    }

    /** Disponibilité par profil, temps de réponse, incidents : la période demandée contre la précédente. */
    public function monitoring(int $days = 1): array
    {
        $days = max(1, min(30, $days));
        $since = now()->subDays($days);
        $prevSince = now()->subDays($days * 2);

        $availability = [];
        foreach (['system' => 'plateforme et serveur', 'traveler' => 'voyageur', 'host' => 'partenaire', 'admin' => 'administrateur'] as $profile => $label) {
            $availability[$label] = [
                'current_ok_percent' => $this->okPercent($profile, $since, now()),
                'previous_ok_percent' => $this->okPercent($profile, $prevSince, $since),
            ];
        }

        $slowest = OpsCheckResult::where('created_at', '>=', $since)->where('duration_ms', '>', 0)
            ->selectRaw("check_key, count(*) as runs, round(avg(duration_ms)) as avg_ms, max(duration_ms) as max_ms, sum(case when status = 'fail' then 1 else 0 end) as failures")
            ->groupBy('check_key')->orderByDesc('avg_ms')->limit(6)->get()
            ->map(fn ($c) => ['check' => $c->check_key, 'runs' => (int) $c->runs, 'avg_ms' => (int) $c->avg_ms, 'max_ms' => (int) $c->max_ms, 'failures' => (int) $c->failures]);

        return [
            'period_days' => $days,
            'availability' => $availability,
            'slowest_checks' => $slowest->all(),
            'incidents' => $this->incidentSummary($since),
            'open_incidents_now' => OpsIncident::where('status', 'open')->orderBy('first_seen_at')->limit(8)->get()->map(fn ($i) => $this->incident($i))->all(),
        ];
    }

    /** Liste des incidents de la période (ouverts ou résolus). */
    public function incidents(int $days = 7): array
    {
        $days = max(1, min(30, $days));

        return OpsIncident::where('first_seen_at', '>=', now()->subDays($days))->orderByDesc('first_seen_at')->limit(15)->get()
            ->map(fn ($i) => $this->incident($i))->all();
    }

    /** Activité réelle de la plateforme (comptes de test exclus), comparée à la période précédente. */
    public function business(int $days = 1): array
    {
        $days = max(1, min(90, $days));
        $since = now()->subDays($days);

        return [
            'period_days' => $days,
            'current' => $this->businessBetween($since, now()),
            'previous' => $this->businessBetween(now()->subDays($days * 2), $since),
        ];
    }

    /** Erreurs les plus fréquentes du journal de l'application, regroupées et nettoyées. */
    public function errors(int $days = 1): array
    {
        $days = max(1, min(7, $days));

        return array_map(
            fn ($e) => ['count' => (int) $e['count'], 'error' => $this->scrub((string) $e['signature'])],
            array_slice($this->logs->scan($days * 1440), 0, 5)
        );
    }

    /** Tout ce qu'il faut pour rédiger le rapport quotidien. */
    public function snapshot(): array
    {
        return [
            'generated_at' => now('Africa/Abidjan')->format('Y-m-d H:i') . ' (heure d\'Abidjan)',
            'audience_7_days' => $this->audience('7d'),
            'monitoring_last_24h' => $this->monitoring(1),
            'monitoring_last_7_days' => $this->monitoring(7),
            'business_last_24h' => $this->business(1),
            'business_last_7_days' => $this->business(7),
            'errors_last_24h' => $this->errors(1),
        ];
    }

    private function okPercent(string $profile, Carbon $from, Carbon $to): ?float
    {
        $total = OpsCheckResult::where('profile', $profile)->whereBetween('created_at', [$from, $to])->count();
        if ($total === 0) {
            return null;
        }
        $ok = OpsCheckResult::where('profile', $profile)->whereBetween('created_at', [$from, $to])->where('status', 'ok')->count();

        return round($ok / $total * 100, 1);
    }

    private function incidentSummary(Carbon $since): array
    {
        $opened = OpsIncident::where('first_seen_at', '>=', $since)->get();
        $resolved = $opened->where('status', 'resolved');

        return [
            'opened' => $opened->count(),
            'resolved' => $resolved->count(),
            'average_resolution_minutes' => $resolved->isEmpty() ? null : (int) round($resolved->avg(fn ($i) => $i->first_seen_at->diffInMinutes($i->resolved_at))),
        ];
    }

    private function incident(OpsIncident $i): array
    {
        return [
            'title' => $this->scrub($i->title),
            'severity' => ['critical' => 'critique', 'major' => 'important', 'minor' => 'mineur'][$i->severity] ?? $i->severity,
            'status' => $i->status === 'open' ? 'en cours' : 'résolu',
            'since' => $i->first_seen_at->setTimezone('Africa/Abidjan')->format('d/m H:i'),
            'minutes_to_resolve' => $i->resolved_at ? (int) $i->first_seen_at->diffInMinutes($i->resolved_at) : null,
        ];
    }

    private function businessBetween(Carbon $from, Carbon $to): array
    {
        $real = fn ($query, string $table) => $query->leftJoin('users', 'users.id', '=', "$table.user_id")
            ->where(fn ($q) => $q->whereNull('users.is_synthetic')->orWhere('users.is_synthetic', false));

        $payments = $real(DB::table('payments')->where('payments.status', 'completed')->whereBetween('payments.created_at', [$from, $to]), 'payments');

        return [
            'booking_requests' => $real(DB::table('bookings')->whereBetween('bookings.created_at', [$from, $to]), 'bookings')->count(),
            'bookings_cancelled' => $real(DB::table('bookings')->where('bookings.status', 'cancelled')->whereBetween('bookings.updated_at', [$from, $to]), 'bookings')->count(),
            'successful_payments' => (clone $payments)->count(),
            'amount_paid_fcfa' => (int) round((float) (clone $payments)->sum('payments.amount')),
            'new_accounts' => DB::table('users')->whereBetween('created_at', [$from, $to])->where(fn ($q) => $q->whereNull('is_synthetic')->orWhere('is_synthetic', false))->count(),
        ];
    }

    /** Un chemin de page n'est repris que s'il ressemble à un chemin : le reste pourrait contenir des consignes cachées. */
    private function cleanPath(string $path): string
    {
        return preg_match('#^/[A-Za-z0-9/_\-.]{0,60}$#', $path) ? $path : '(autre page)';
    }

    private function cleanHost(string $host): string
    {
        return preg_match('/^[A-Za-z0-9.\-]{1,60}$/', $host) ? $host : 'Autre';
    }

    /** Retire e-mails et numéros des textes d'erreur, qui peuvent citer ce qu'un client avait saisi. */
    private function scrub(string $text): string
    {
        $text = preg_replace('/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/', '[e-mail]', $text) ?? $text;
        $text = preg_replace('/\+?\d[\d\s().\-]{7,}\d/', '[numéro]', $text) ?? $text;

        return mb_substr(trim($text), 0, 140);
    }
}
