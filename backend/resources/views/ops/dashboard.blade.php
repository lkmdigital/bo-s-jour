@extends('ops.layouts.app')

@section('title', 'Vue d\'ensemble')
@section('page_title', "Vue d'ensemble")

@section('content')
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div class="ops-card p-5 opacity-50">
            <p class="text-sm text-gray-500 mb-1">Technique</p>
            <p class="text-3xl font-bold text-gray-300">—</p>
            <p class="text-xs text-gray-400 mt-1">Module à venir</p>
        </div>
    </div>
@endsection
