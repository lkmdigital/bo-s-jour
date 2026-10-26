@extends('ops.layouts.app')

@section('title', 'Vue d\'ensemble')
@section('page_title', "Vue d'ensemble")

@section('content')
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="{{ route('ops.monitoring.index') }}" class="ops-card p-5 hover:shadow-md transition-shadow sm:col-span-3">
            <p class="text-sm text-gray-500 mb-1">Supervision</p>
            @if ($supervision['stale'])
                <p class="text-xl font-bold text-gray-600">⚪ Supervision à l'arrêt</p>
                <p class="text-xs text-gray-400 mt-1">Le moniteur n'a pas tourné depuis plus de 5 minutes.</p>
            @elseif ($supervision['critical'] > 0)
                <p class="text-xl font-bold text-red-600">🔴 {{ $supervision['critical'] }} incident(s) critique(s) en cours</p>
                <p class="text-xs text-gray-400 mt-1">Voir le détail et les captures d'écran.</p>
            @elseif ($supervision['open'] > 0)
                <p class="text-xl font-bold text-amber-600">🟠 {{ $supervision['open'] }} incident(s) en cours</p>
                <p class="text-xs text-gray-400 mt-1">Aucun n'est critique.</p>
            @else
                <p class="text-xl font-bold text-emerald-600">✅ Tout fonctionne</p>
                <p class="text-xs text-gray-400 mt-1">Les parcours voyageur, partenaire et administrateur sont contrôlés en continu.</p>
            @endif
        </a>
        <a href="{{ route('ops.payments.index') }}" class="ops-card p-5 hover:shadow-md transition-shadow">
            <p class="text-sm text-gray-500 mb-1">Paiements à traiter</p>
            <p class="text-3xl font-bold {{ $stuckPaymentsCount > 0 ? 'text-primary' : 'text-gray-900' }}">{{ $stuckPaymentsCount }}</p>
            <p class="text-xs text-gray-400 mt-1">En attente ou échoués, 7 derniers jours</p>
        </a>
        <div class="ops-card p-5 opacity-50">
            <p class="text-sm text-gray-500 mb-1">Réservations &amp; litiges</p>
            <p class="text-3xl font-bold text-gray-300">—</p>
            <p class="text-xs text-gray-400 mt-1">Module à venir</p>
        </div>
        <a href="{{ route('ops.logs.index') }}" class="ops-card p-5 hover:shadow-md transition-shadow">
            <p class="text-sm text-gray-500 mb-1">Flux de logs</p>
            <p class="text-3xl font-bold text-gray-900">→</p>
            <p class="text-xs text-gray-400 mt-1">Application &amp; sécurité, en direct</p>
        </a>
    </div>
@endsection
