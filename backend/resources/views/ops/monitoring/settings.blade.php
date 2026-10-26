@extends('ops.layouts.app')

@section('title', 'Alertes')
@section('page_title', 'Alertes de supervision')

@section('content')
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 ops-card p-6">
            <form method="POST" action="{{ route('ops.monitoring.settings.save') }}" class="space-y-5">
                @csrf
                <label class="flex items-start gap-3">
                    <input type="checkbox" name="enabled" value="1" class="mt-1" {{ $enabled ? 'checked' : '' }}>
                    <span>
                        <span class="font-semibold">Envoyer les alertes</span>
                        <span class="block text-sm text-gray-500">Désactivé : la supervision continue d'enregistrer les incidents, sans rien envoyer.</span>
                    </span>
                </label>

                <div>
                    <label class="block font-semibold mb-1" for="phones">Numéros WhatsApp alertés</label>
                    <textarea id="phones" name="phones" rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="2250161133466">{{ old('phones', $phones) }}</textarea>
                    <p class="text-xs text-gray-500 mt-1">Un numéro par ligne, avec l'indicatif (225…). Les incidents critiques partent tout de suite ; les « importants » sont mis de côté entre 22 h et 7 h.</p>
                </div>

                <div>
                    <label class="block font-semibold mb-1" for="emails">Adresses e-mail alertées</label>
                    <textarea id="emails" name="emails" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="vous@exemple.com">{{ old('emails', $emails) }}</textarea>
                    <p class="text-xs text-gray-500 mt-1">Second canal : continue de fonctionner même si WhatsApp tombe.</p>
                </div>

                <button type="submit" class="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-semibold">Enregistrer</button>
            </form>

            <form method="POST" action="{{ route('ops.monitoring.settings.test') }}" class="mt-4">
                @csrf
                <button type="submit" class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50">Envoyer une alerte de test</button>
            </form>
        </div>

        <div class="space-y-6">
            <div class="ops-card p-5 text-sm">
                <h2 class="font-bold mb-2">Signal de vie externe</h2>
                <p class="text-gray-600 mb-2">Si le serveur tombe, il ne peut pas prévenir lui-même. Un service gratuit (UptimeRobot…) doit interroger cette adresse toutes les 5 minutes et vous écrire si elle ne répond plus <code>200</code> :</p>
                @if ($heartbeatUrl)
                    <code class="block break-all bg-gray-100 rounded px-2 py-1.5 text-xs">{{ $heartbeatUrl }}</code>
                @else
                    <p class="text-amber-700">Jeton non configuré (OPS_HEARTBEAT_TOKEN).</p>
                @endif
            </div>
            <div class="ops-card p-5 text-sm">
                <h2 class="font-bold mb-2">Modèle WhatsApp</h2>
                <p class="text-gray-600">Les alertes utilisent le modèle Meta <code>{{ $template }}</code>. Sans lui, elles tentent un texte libre, qui ne passe que dans les 24 h suivant un message de votre part au numéro.</p>
            </div>
        </div>
    </div>

    <div class="ops-card mt-6 overflow-hidden">
        <h2 class="font-bold px-5 py-4 border-b border-gray-100">Dernières alertes envoyées</h2>
        <table class="w-full text-sm">
            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th class="px-4 py-2">Date</th><th class="px-4 py-2">Type</th><th class="px-4 py-2">Canal</th><th class="px-4 py-2">Destinataire</th><th class="px-4 py-2">Résultat</th></tr></thead>
            <tbody class="divide-y divide-gray-100">
                @forelse ($recent as $alert)
                    <tr>
                        <td class="px-4 py-2 whitespace-nowrap">{{ $alert->created_at->setTimezone('Africa/Abidjan')->format('d/m H:i') }}</td>
                        <td class="px-4 py-2">{{ $alert->type }}</td>
                        <td class="px-4 py-2">{{ $alert->channel }}</td>
                        <td class="px-4 py-2">{{ $alert->recipient }}</td>
                        <td class="px-4 py-2">
                            <span class="ops-badge {{ $alert->status === 'sent' ? 'ops-badge-emerald' : ($alert->status === 'failed' ? 'ops-badge-red' : 'ops-badge-gray') }}">{{ $alert->status }}</span>
                            <span class="text-xs text-gray-400">{{ $alert->error }}</span>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="5" class="px-4 py-6 text-center text-gray-400">Aucune alerte envoyée pour l'instant.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
@endsection
