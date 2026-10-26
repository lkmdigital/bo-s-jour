@extends('ops.layouts.app')

@section('title', 'Audience')
@section('page_title', 'Audience du site')

@php
    $fmt = fn ($n) => number_format($n, 0, ',', ' ');
    $delta = function ($pct) {
        if ($pct === null) return ['—', 'text-gray-400'];
        return [($pct >= 0 ? '▲ +' : '▼ ') . $pct . ' %', $pct >= 0 ? 'text-emerald-600' : 'text-red-600'];
    };
    $labels = ['mobile' => 'Mobile', 'tablet' => 'Tablette', 'desktop' => 'Ordinateur'];
@endphp

@section('content')
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div class="flex gap-2 text-sm">
            @foreach ($periods as $key => $label)
                <a href="{{ route('ops.audience.index', ['period' => $key]) }}" class="px-3 py-1.5 rounded-lg border {{ $r['period'] === $key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700' }}">{{ $label }}</a>
            @endforeach
        </div>
        <div class="ops-card px-4 py-2 flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full {{ $r['live'] > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300' }}"></span>
            <span class="font-bold">{{ $r['live'] }}</span> visiteur(s) en ce moment <span class="text-gray-400">(5 dernières minutes)</span>
        </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        @foreach ([['Visiteurs', $r['current']['visitors'], $r['change']['visitors']], ['Pages vues', $r['current']['views'], $r['change']['views']]] as [$name, $value, $pct])
            @php [$text, $color] = $delta($pct); @endphp
            <div class="ops-card p-5">
                <p class="text-sm text-gray-500 mb-1">{{ $name }}</p>
                <p class="text-3xl font-bold">{{ $fmt($value) }}</p>
                <p class="text-xs mt-1 {{ $color }}">{{ $text }} <span class="text-gray-400">vs période précédente</span></p>
            </div>
        @endforeach
        <div class="ops-card p-5">
            <p class="text-sm text-gray-500 mb-1">Pages par visiteur</p>
            <p class="text-3xl font-bold">{{ str_replace('.', ',', $r['current']['per_visitor']) }}</p>
            <p class="text-xs mt-1 text-gray-400">Période précédente : {{ str_replace('.', ',', $r['previous']['per_visitor']) }}</p>
        </div>
    </div>

    <div class="ops-card p-5 mb-6">
        <h2 class="font-bold mb-4">Pages vues par jour</h2>
        <div class="flex items-end gap-px h-40" role="img" aria-label="Pages vues par jour">
            @foreach ($r['daily'] as $d)
                <div class="flex-1 min-w-[2px] bg-primary/80 hover:bg-primary rounded-t-sm" style="height: {{ max(2, round($d['views'] / $r['max_views'] * 100)) }}%"
                     title="{{ \Carbon\Carbon::parse($d['day'])->translatedFormat('D j M') }} : {{ $d['views'] }} pages vues, {{ $d['visitors'] }} visiteur(s)"></div>
            @endforeach
        </div>
        <div class="flex justify-between text-xs text-gray-400 mt-2">
            <span>{{ $r['start']->translatedFormat('j M') }}</span><span>{{ $r['end']->translatedFormat('j M') }}</span>
        </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div class="ops-card overflow-hidden">
            <h2 class="font-bold px-5 py-4 border-b border-gray-100">Pages les plus vues</h2>
            <table class="w-full text-sm">
                <tbody class="divide-y divide-gray-100">
                    @forelse ($r['top_pages'] as $p)
                        <tr><td class="px-5 py-2.5 break-all">{{ $p->path }}</td><td class="px-3 py-2.5 text-right text-gray-400 whitespace-nowrap">{{ $p->visitors }} visiteur(s)</td><td class="px-5 py-2.5 text-right font-semibold">{{ $fmt($p->views) }}</td></tr>
                    @empty
                        <tr><td class="px-5 py-8 text-center text-gray-400">Pas encore de visites enregistrées sur cette période.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="ops-card overflow-hidden">
            <h2 class="font-bold px-5 py-4 border-b border-gray-100">D'où viennent les visiteurs</h2>
            <table class="w-full text-sm">
                <tbody class="divide-y divide-gray-100">
                    @forelse ($r['referrers'] as $row)
                        <tr><td class="px-5 py-2.5">{{ $row['label'] }}</td><td class="px-3 py-2.5 text-right text-gray-400">{{ str_replace('.', ',', $row['share']) }} %</td><td class="px-5 py-2.5 text-right font-semibold">{{ $fmt($row['views']) }}</td></tr>
                    @empty
                        <tr><td class="px-5 py-8 text-center text-gray-400">Aucune donnée.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        @foreach ([['Appareils', $r['devices'], $labels], ['Navigateurs', $r['browsers'], []], ['Systèmes', $r['systems'], []], ['Langues', $r['languages'], ['fr' => 'Français', 'en' => 'Anglais']]] as [$title, $rows, $map])
            <div class="ops-card p-5">
                <h2 class="font-bold mb-3">{{ $title }}</h2>
                @forelse ($rows as $row)
                    <div class="mb-2.5">
                        <div class="flex justify-between text-sm"><span>{{ $map[$row['label']] ?? $row['label'] }}</span><span class="text-gray-500">{{ str_replace('.', ',', $row['share']) }} %</span></div>
                        <div class="h-1.5 bg-gray-100 rounded-full mt-1"><div class="h-1.5 bg-primary rounded-full" style="width: {{ $row['share'] }}%"></div></div>
                    </div>
                @empty
                    <p class="text-sm text-gray-400">Aucune donnée.</p>
                @endforelse
            </div>
        @endforeach
    </div>

    <p class="text-xs text-gray-400 mt-6">Mesure interne, sans cookie ni donnée personnelle : chaque visiteur n'est reconnu que par une empreinte qui change chaque jour, donc « Visiteurs » cumule les visiteurs distincts de chaque jour. Les robots, la supervision et les espaces connectés ne sont pas comptés. Pour les pays et les campagnes, voir Google Analytics.</p>
@endsection
