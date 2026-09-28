@extends('ops.layouts.app')

@section('title', 'Flux de logs')
@section('page_title', 'Flux de logs')

@section('content')
    <div class="flex flex-wrap items-center gap-2 mb-4" id="logs-toolbar">
        <div class="flex items-center gap-1 ops-card !rounded-lg p-1">
            <button type="button" data-source="app" class="ops-log-tab px-3 py-1.5 rounded-md text-sm font-semibold">Application</button>
            <button type="button" data-source="security" class="ops-log-tab px-3 py-1.5 rounded-md text-sm font-semibold">Sécurité</button>
        </div>

        <select id="logs-level-filter" class="ops-input !w-auto text-sm">
            <option value="">Tous les niveaux</option>
            <option value="ERROR">Erreurs</option>
            <option value="WARNING">Avertissements</option>
            <option value="INFO">Informations</option>
        </select>

        <input type="text" id="logs-search" placeholder="Filtrer (référence, e-mail, mot-clé…)" class="ops-input !w-64 text-sm">

        <div class="ml-auto flex items-center gap-2">
            <span id="logs-status" class="text-xs text-gray-400">Connexion…</span>
            <button type="button" id="logs-toggle" class="ops-btn-outline text-xs !py-1.5">Pause</button>
        </div>
    </div>

    <div class="ops-card overflow-hidden">
        <div id="logs-feed" class="max-h-[70vh] overflow-y-auto" aria-live="polite"></div>
        <p id="logs-empty" class="p-6 text-sm text-gray-500 hidden">Aucune entrée pour l'instant — en attente de nouvelles lignes…</p>
    </div>

    <p class="text-xs text-gray-400 mt-3">
        Les champs sensibles (mots de passe, jetons, pièces d'identité…) sont masqués. Les journaux complets restent consultables sur le serveur si besoin d'un détail supplémentaire.
    </p>

    <div id="logs-config" class="hidden" data-tail-url="{{ route('ops.logs.tail') }}"></div>
@endsection
