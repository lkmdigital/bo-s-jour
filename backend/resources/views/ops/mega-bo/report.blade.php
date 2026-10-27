@extends('ops.layouts.app')

@section('title', 'Rapport Mega Bo')
@section('page_title', 'Rapport Mega Bo du ' . $report->report_date->format('d/m/Y'))

@push('head')
<style>
    .mb-report h2 { font-size:16px; font-weight:700; margin:22px 0 6px; }
    .mb-report p { margin:6px 0; line-height:1.6; } .mb-report ul { margin:6px 0 6px 20px; list-style:disc; }
    .mb-report strong { font-weight:600; }
</style>
@endpush

@section('content')
<div class="max-w-3xl">
    <a href="{{ route('ops.megabo.index') }}" class="text-sm text-gray-500 hover:underline">← Mega Bo</a>
    <div class="ops-card p-6 mt-3">
        <div class="flex items-center gap-3 mb-2">
            @include('ops.mega-bo._orb', ['size' => 38])
            <div>
                <p class="text-xs uppercase tracking-wide text-gray-500">{{ $report->report_date->format('d/m/Y') }}{{ $report->sent_at ? ' · envoyé le ' . $report->sent_at->setTimezone('Africa/Abidjan')->format('d/m à H:i') : ' · non envoyé' }}</p>
                <h2 class="text-lg font-bold">{{ $report->headline }}</h2>
            </div>
        </div>
        <div class="mb-report text-sm">{!! $html !!}</div>
        <p class="text-xs text-gray-400 mt-6 pt-3 border-t border-gray-100">Rédigé par Mega Bo{{ $report->model ? ' (' . $report->model . ')' : '' }} à partir des chiffres de la plateforme. Il peut se tromper : les chiffres de référence sont dans Audience et Supervision.</p>
    </div>

    @if ($report->snapshot)
        <details class="ops-card p-5 mt-4 text-sm">
            <summary class="font-semibold cursor-pointer">Chiffres transmis à Mega Bo (pour vérifier)</summary>
            <pre class="mt-3 text-xs bg-gray-50 rounded p-3 overflow-x-auto">{{ json_encode($report->snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) }}</pre>
        </details>
    @endif
</div>
@endsection
