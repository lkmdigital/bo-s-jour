@extends('ops.layouts.app')

@section('title', 'Incidents')
@section('page_title', 'Incidents')

@php
    $sev = ['critical' => ['ops-badge ops-badge-red', 'Critique'], 'major' => ['ops-badge ops-badge-amber', 'Important'], 'minor' => ['ops-badge ops-badge-gray', 'Mineur']];
@endphp

@section('content')
    <div class="flex gap-2 mb-4 text-sm">
        @foreach ([null => 'Tous', 'open' => 'En cours', 'resolved' => 'Résolus'] as $value => $label)
            <a href="{{ route('ops.monitoring.incidents', $value ? ['status' => $value] : []) }}"
               class="px-3 py-1.5 rounded-lg border {{ $status === $value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700' }}">{{ $label }}</a>
        @endforeach
    </div>

    <div class="ops-card overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-3">Gravité</th><th class="px-4 py-3">Incident</th><th class="px-4 py-3">Début</th><th class="px-4 py-3">Fin</th><th class="px-4 py-3">Échecs</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($incidents as $incident)
                    <tr class="align-top">
                        <td class="px-4 py-3"><span class="{{ $sev[$incident->severity][0] }}">{{ $sev[$incident->severity][1] }}</span></td>
                        <td class="px-4 py-3">
                            <p class="font-semibold">{{ $incident->title }}</p>
                            <p class="text-xs text-gray-500 break-words max-w-xl">{{ \Illuminate\Support\Str::limit($incident->last_message, 300) }}</p>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">{{ $incident->first_seen_at->setTimezone('Africa/Abidjan')->format('d/m H:i') }}</td>
                        <td class="px-4 py-3 whitespace-nowrap">{{ $incident->resolved_at ? $incident->resolved_at->setTimezone('Africa/Abidjan')->format('d/m H:i') : '— en cours' }}</td>
                        <td class="px-4 py-3">{{ $incident->failure_count }}</td>
                    </tr>
                @empty
                    <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400">Aucun incident.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="mt-4">{{ $incidents->links() }}</div>
@endsection
