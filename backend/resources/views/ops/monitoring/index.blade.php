@extends('ops.layouts.app')

@section('title', 'Supervision')
@section('page_title', 'Supervision')

@push('head')
    <meta http-equiv="refresh" content="60">
@endpush

@php
    $banner = [
        'ok' => ['bg-emerald-50 border-emerald-200 text-emerald-800', '✅', 'Tout fonctionne', 'Aucun incident en cours.'],
        'degraded' => ['bg-amber-50 border-amber-200 text-amber-800', '🟠', 'Service dégradé', 'Des incidents non critiques sont en cours.'],
        'critical' => ['bg-red-50 border-red-200 text-red-800', '🔴', 'Incident critique', 'Au moins un incident critique est en cours.'],
        'stale' => ['bg-gray-100 border-gray-300 text-gray-800', '⚪', 'Supervision à l\'arrêt', 'Le moniteur n\'a pas tourné depuis plus de 5 minutes : les données ci-dessous ne sont plus à jour.'],
    ][$global];
    $dot = ['ok' => 'bg-emerald-500', 'warn' => 'bg-amber-400', 'fail' => 'bg-red-500'];
    $sev = ['critical' => ['ops-badge ops-badge-red', 'Critique'], 'major' => ['ops-badge ops-badge-amber', 'Important'], 'minor' => ['ops-badge ops-badge-gray', 'Mineur']];
@endphp

@section('content')
    <div class="mb-6 px-5 py-4 rounded-xl border {{ $banner[0] }} flex items-center justify-between gap-4">
        <div>
            <p class="font-bold text-lg">{{ $banner[1] }} {{ $banner[2] }}</p>
            <p class="text-sm">{{ $banner[3] }}
                @if ($lastRun) <span class="opacity-70">Dernier passage : {{ $lastRun->setTimezone('Africa/Abidjan')->format('H:i:s') }}.</span> @endif
            </p>
        </div>
        <form method="POST" action="{{ route('ops.monitoring.run') }}">
            @csrf
            <button type="submit" class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50">Tout contrôler maintenant</button>
        </form>
    </div>

    @if ($open->isNotEmpty())
        <div class="ops-card p-5 mb-6">
            <h2 class="font-bold mb-3">Incidents en cours ({{ $open->count() }})</h2>
            <div class="divide-y divide-gray-100">
                @foreach ($open as $incident)
                    <div class="py-3 flex items-start gap-3">
                        <span class="{{ $sev[$incident->severity][0] }} mt-0.5">{{ $sev[$incident->severity][1] }}</span>
                        <div class="min-w-0 flex-1">
                            <p class="font-semibold">{{ $incident->title }}</p>
                            <p class="text-sm text-gray-600 break-words">{{ \Illuminate\Support\Str::limit($incident->last_message, 260) }}</p>
                            <p class="text-xs text-gray-400 mt-1">Depuis {{ $incident->first_seen_at->setTimezone('Africa/Abidjan')->format('d/m H:i') }} · {{ $incident->failure_count }} échec(s) de suite</p>
                        </div>
                        @if ($incident->screenshot)
                            <a class="text-xs text-primary underline" href="{{ route('ops.monitoring.screenshot', ['path' => basename($incident->screenshot)]) }}" target="_blank">Capture</a>
                        @endif
                    </div>
                @endforeach
            </div>
        </div>
    @endif

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        @foreach ($profiles as $profileKey => $profileLabel)
            @continue(empty($byProfile[$profileKey]))
            <div class="ops-card p-5">
                <h2 class="font-bold mb-3">{{ $profileLabel }}</h2>
                <div class="divide-y divide-gray-100">
                    @foreach ($byProfile[$profileKey] as $check)
                        @php $row = $latest[$check->key]; $status = $row?->status; @endphp
                        <div class="py-2.5 flex items-center gap-3">
                            <span class="w-2.5 h-2.5 rounded-full shrink-0 {{ $status ? $dot[$status] : 'bg-gray-300' }}" title="{{ $status ?? 'jamais exécuté' }}"></span>
                            <div class="min-w-0 flex-1">
                                <p class="text-sm font-medium truncate">{{ $check->label }}</p>
                                <p class="text-xs text-gray-500 truncate" title="{{ $row?->message }}">{{ $row ? \Illuminate\Support\Str::limit($row->message, 110) : 'Pas encore exécuté' }}</p>
                            </div>
                            <div class="hidden sm:flex gap-px items-end h-5" aria-hidden="true">
                                @foreach ($history[$check->key] as $s)
                                    <span class="w-1 h-4 rounded-sm {{ $dot[$s] }}"></span>
                                @endforeach
                            </div>
                            <div class="text-right shrink-0 w-20">
                                <p class="text-xs text-gray-500">{{ $row ? $row->duration_ms . ' ms' : '' }}</p>
                                <p class="text-[11px] text-gray-400">{{ $row?->created_at?->setTimezone('Africa/Abidjan')->format('H:i') }}</p>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        @endforeach
    </div>
@endsection
