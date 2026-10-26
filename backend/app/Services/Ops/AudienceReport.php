<?php

namespace App\Services\Ops;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Chiffres de fréquentation pour l'espace Ops : visiteurs, pages vues, évolution jour par jour, pages les plus vues,
 * sources, appareils. « Visiteurs » = visiteurs distincts de chaque jour, cumulés (l'empreinte change chaque jour,
 * un même visiteur revenu deux jours compte deux fois).
 */
class AudienceReport
{
    public const PERIODS = ['today' => "Aujourd'hui", '7d' => '7 jours', '30d' => '30 jours', '90d' => '90 jours'];

    public function build(string $period): array
    {
        $period = array_key_exists($period, self::PERIODS) ? $period : '7d';
        $days = match ($period) { 'today' => 1, '7d' => 7, '30d' => 30, default => 90 };
        $end = Carbon::today();
        $start = $end->copy()->subDays($days - 1);
        $prevEnd = $start->copy()->subDay();
        $prevStart = $prevEnd->copy()->subDays($days - 1);

        $current = $this->totals($start, $end);
        $previous = $this->totals($prevStart, $prevEnd);

        $series = DB::table('ops_visits')->whereBetween('day', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('day, count(*) as views, count(distinct visitor) as visitors')->groupBy('day')->get()->keyBy(fn ($r) => substr((string) $r->day, 0, 10));
        $daily = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $row = $series->get($d->toDateString());
            $daily[] = ['day' => $d->toDateString(), 'views' => (int) ($row->views ?? 0), 'visitors' => (int) ($row->visitors ?? 0)];
        }

        return [
            'period' => $period,
            'start' => $start,
            'end' => $end,
            'current' => $current,
            'previous' => $previous,
            'change' => [
                'visitors' => $this->percentChange($previous['visitors'], $current['visitors']),
                'views' => $this->percentChange($previous['views'], $current['views']),
            ],
            'daily' => $daily,
            'max_views' => max(1, ...array_column($daily, 'views')),
            'live' => (int) DB::table('ops_visits')->where('visited_at', '>=', now()->subMinutes(5))->distinct()->count('visitor'),
            'top_pages' => DB::table('ops_visits')->whereBetween('day', [$start->toDateString(), $end->toDateString()])
                ->selectRaw('path, count(*) as views, count(distinct visitor) as visitors')->groupBy('path')->orderByDesc('views')->limit(10)->get(),
            'referrers' => $this->breakdown('referrer', $start, $end, 8, 'Accès direct'),
            'devices' => $this->breakdown('device', $start, $end),
            'browsers' => $this->breakdown('browser', $start, $end),
            'systems' => $this->breakdown('os', $start, $end),
            'languages' => $this->breakdown('lang', $start, $end, 6, 'Inconnue'),
        ];
    }

    /** @return array{visitors:int,views:int,per_visitor:float} */
    private function totals(Carbon $start, Carbon $end): array
    {
        $perDay = DB::table('ops_visits')->whereBetween('day', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('day, count(*) as views, count(distinct visitor) as visitors')->groupBy('day')->get();
        $visitors = (int) $perDay->sum('visitors');
        $views = (int) $perDay->sum('views');

        return ['visitors' => $visitors, 'views' => $views, 'per_visitor' => $visitors ? round($views / $visitors, 1) : 0.0];
    }

    /** @return array<int,array{label:string,visitors:int,share:float}> */
    private function breakdown(string $column, Carbon $start, Carbon $end, int $limit = 6, string $emptyLabel = 'Inconnu'): array
    {
        $rows = DB::table('ops_visits')->whereBetween('day', [$start->toDateString(), $end->toDateString()])
            ->selectRaw("$column as label, count(*) as views")->groupBy($column)->orderByDesc('views')->limit($limit)->get();
        $total = max(1, (int) $rows->sum('views'));

        return $rows->map(fn ($r) => ['label' => $r->label ?: $emptyLabel, 'views' => (int) $r->views, 'share' => round($r->views / $total * 100, 1)])->all();
    }

    private function percentChange(int $before, int $after): ?float
    {
        return $before > 0 ? round(($after - $before) / $before * 100, 1) : null;
    }
}
