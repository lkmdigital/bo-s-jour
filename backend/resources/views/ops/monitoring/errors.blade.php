@extends('ops.layouts.app')

@section('title', 'Erreurs regroupées')
@section('page_title', 'Erreurs regroupées')

@php
    $labels = ['sms' => 'SMS', 'whatsapp' => 'WhatsApp', 'ai' => 'Assistant Bo', 'payment' => 'Paiement', 'mail' => 'E-mail', 'database' => 'Base de données', 'other' => 'Autre'];
@endphp

@section('content')
    <div class="flex flex-wrap items-center gap-2 mb-4 text-sm">
        @foreach ([60 => '1 heure', 360 => '6 heures', 1440 => '24 heures', 4320 => '3 jours'] as $value => $label)
            <a href="{{ route('ops.monitoring.errors', ['minutes' => $value, 'warnings' => $withWarnings ? 1 : 0]) }}"
               class="px-3 py-1.5 rounded-lg border {{ $minutes === $value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300 text-gray-700' }}">{{ $label }}</a>
        @endforeach
        <a href="{{ route('ops.monitoring.errors', ['minutes' => $minutes, 'warnings' => $withWarnings ? 0 : 1]) }}" class="ml-2 text-xs text-gray-500 underline">
            {{ $withWarnings ? 'Masquer les avertissements' : 'Inclure les avertissements' }}
        </a>
    </div>

    <p class="text-sm text-gray-500 mb-3">Les erreurs identiques sont regroupées (les numéros, identifiants et adresses qui varient sont masqués). Pour le détail ligne par ligne, voir « Flux de logs ».</p>

    <div class="ops-card overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr><th class="px-4 py-3">Nombre</th><th class="px-4 py-3">Famille</th><th class="px-4 py-3">Erreur</th><th class="px-4 py-3">Dernière fois</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($groups as $group)
                    <tr class="align-top">
                        <td class="px-4 py-3 font-bold {{ $group['count'] >= 10 ? 'text-red-600' : '' }}">{{ $group['count'] }}×</td>
                        <td class="px-4 py-3"><span class="ops-badge ops-badge-blue">{{ $labels[$group['category']] ?? 'Autre' }}</span> <span class="text-[11px] text-gray-400">{{ $group['level'] }}</span></td>
                        <td class="px-4 py-3">
                            <p class="font-medium break-words max-w-2xl">{{ $group['signature'] }}</p>
                            <p class="text-xs text-gray-400 break-words max-w-2xl mt-0.5">{{ \Illuminate\Support\Str::limit($group['sample'], 220) }}</p>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap">{{ \Carbon\Carbon::parse($group['last_seen'])->format('d/m H:i') }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4" class="px-4 py-8 text-center text-emerald-600">✅ Aucune erreur sur cette période.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
@endsection
