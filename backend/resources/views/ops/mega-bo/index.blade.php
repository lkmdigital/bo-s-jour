@extends('ops.layouts.app')

@section('title', 'Mega Bo')
@section('page_title', 'Mega Bo')

@push('head')
<meta name="csrf-token" content="{{ csrf_token() }}">
<style>
    .mb-chat { display:flex; flex-direction:column; height:calc(100vh - 190px); min-height:420px; }
    .mb-log { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px; }
    .mb-msg { max-width:min(680px,92%); padding:11px 15px; border-radius:14px; font-size:14px; line-height:1.55; overflow-wrap:anywhere; }
    .mb-msg.user { align-self:flex-end; background:#111; color:#fff; border-bottom-right-radius:4px; }
    .mb-msg.bot { align-self:flex-start; background:#f3f4f6; color:#111; border-bottom-left-radius:4px; }
    .mb-msg.error { align-self:flex-start; background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
    .mb-msg ul { margin:6px 0 6px 18px; list-style:disc; } .mb-msg p + p, .mb-msg p + ul, .mb-msg ul + p { margin-top:8px; }
    .mb-hello { margin:auto; text-align:center; max-width:460px; color:#555; }
    .mb-hello h2 { font-size:20px; font-weight:700; color:#111; margin:10px 0 4px; }
    .mb-chips { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:16px; }
    .mb-chip { border:1px solid #d1d5db; background:#fff; border-radius:999px; padding:7px 13px; font-size:13px; cursor:pointer; text-align:left; }
    .mb-chip:hover { border-color:#111; }
    .mb-form { display:flex; gap:10px; padding:14px 16px; border-top:1px solid #e5e7eb; }
    .mb-form textarea { flex:1; resize:none; border:1px solid #d1d5db; border-radius:12px; padding:10px 12px; font-size:14px; max-height:120px; }
    .mb-form button { border-radius:12px; background:#111; color:#fff; font-weight:600; padding:0 20px; }
    .mb-form button:disabled { opacity:.5; cursor:wait; }
    .mb-dots span { display:inline-block; width:6px; height:6px; margin-right:4px; border-radius:50%; background:#9ca3af; animation:mb-b 1s infinite; }
    .mb-dots span:nth-child(2){animation-delay:.15s} .mb-dots span:nth-child(3){animation-delay:.3s}
    @keyframes mb-b { 0%,80%,100%{transform:translateY(0);opacity:.5} 40%{transform:translateY(-4px);opacity:1} }
    @media (prefers-reduced-motion: reduce) { .mb-dots span { animation:none } }
</style>
@endpush

@section('content')
<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <div class="xl:col-span-2 ops-card mb-chat" style="overflow:hidden">
        <div id="mb-log" class="mb-log" aria-live="polite">
            <div id="mb-hello" class="mb-hello">
                @include('ops.mega-bo._orb', ['size' => 72, 'class' => 'mx-auto'])
                <h2>Je suis Mega Bo</h2>
                <p class="text-sm">Je lis la fréquentation, la santé de la plateforme et l'activité de boséjour, et je réponds à vos questions. Je ne modifie rien et je ne vois aucune donnée de client.</p>
                @if ($available)
                    <div class="mb-chips">
                        @foreach ($suggestions as $s)
                            <button type="button" class="mb-chip" data-q="{{ $s }}">{{ $s }}</button>
                        @endforeach
                    </div>
                @else
                    <p class="mt-4 text-sm text-amber-700">Mega Bo n'est pas encore activé : la clé API Anthropic doit être renseignée dans l'administration (Paramètres &gt; Réglages avancés).</p>
                @endif
            </div>
        </div>
        <form id="mb-form" class="mb-form" autocomplete="off">
            <textarea id="mb-input" rows="1" maxlength="1000" placeholder="Posez une question à Mega Bo…" aria-label="Votre question" {{ $available ? '' : 'disabled' }}></textarea>
            <button type="submit" id="mb-send" {{ $available ? '' : 'disabled' }}>Envoyer</button>
        </form>
    </div>

    <div class="space-y-6">
        <div class="ops-card p-5 text-sm">
            <h2 class="font-bold mb-1">Rapport quotidien</h2>
            <p class="text-gray-600 mb-3">
                @if ($sending)
                    Envoyé chaque matin vers 8 h 10 (Abidjan), par WhatsApp et e-mail.
                @else
                    L'envoi automatique est désactivé. Activez-le dans <a href="{{ route('ops.monitoring.settings') }}" class="underline">Alertes</a>.
                @endif
            </p>
            <ul class="divide-y divide-gray-100">
                @forelse ($reports as $r)
                    <li class="py-2">
                        <a href="{{ route('ops.megabo.report', $r) }}" class="block hover:underline">
                            <span class="text-xs text-gray-500">{{ $r->report_date->format('d/m/Y') }}{{ $r->sent_at ? ' · envoyé' : '' }}</span>
                            <span class="block font-medium">{{ $r->headline }}</span>
                        </a>
                    </li>
                @empty
                    <li class="py-3 text-gray-400">Aucun rapport pour l'instant : le premier arrivera demain matin.</li>
                @endforelse
            </ul>
        </div>
        <div class="ops-card p-5 text-sm text-gray-600">
            <h2 class="font-bold text-gray-900 mb-1">À savoir</h2>
            <p>Mega Bo peut se tromper : les chiffres de référence restent dans <a class="underline" href="{{ route('ops.audience.index') }}">Audience</a> et <a class="underline" href="{{ route('ops.monitoring.index') }}">Supervision</a>. Il dit quand une donnée manque, notamment pour l'audience, dont la mesure vient de démarrer.</p>
        </div>
    </div>
</div>

<script>
(() => {
    const log = document.getElementById('mb-log'), form = document.getElementById('mb-form'),
          input = document.getElementById('mb-input'), send = document.getElementById('mb-send'),
          hello = document.getElementById('mb-hello'), token = document.querySelector('meta[name="csrf-token"]').content;
    const history = [];
    const url = @json(route('ops.megabo.ask'));

    const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Rendu minimal et sûr : le texte est échappé d'abord, puis seuls le gras, les listes et les paragraphes sont ajoutés.
    function render(text) {
        const blocks = esc(text).split(/\n{2,}/).map(b => {
            const lines = b.split('\n');
            if (lines.every(l => /^\s*[-•*]\s+/.test(l))) return '<ul>' + lines.map(l => '<li>' + l.replace(/^\s*[-•*]\s+/, '') + '</li>').join('') + '</ul>';
            return '<p>' + lines.join('<br>') + '</p>';
        });
        return blocks.join('').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }
    function add(kind, html) {
        hello && hello.remove();
        const el = document.createElement('div');
        el.className = 'mb-msg ' + kind; el.innerHTML = html;
        log.appendChild(el); log.scrollTop = log.scrollHeight;
        return el;
    }
    async function ask(question) {
        question = question.trim(); if (!question) return;
        add('user', esc(question)); input.value = ''; input.style.height = 'auto';
        send.disabled = input.disabled = true;
        const wait = add('bot', '<span class="mb-dots" aria-label="Mega Bo réfléchit"><span></span><span></span><span></span></span>');
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify({ question, history: history.slice(-10) }) });
            const data = await res.json().catch(() => ({}));
            wait.remove();
            if (!res.ok || !data.answer) { add('error', esc(data.error || 'Mega Bo n\'a pas pu répondre. Réessayez dans un instant.')); }
            else { add('bot', render(data.answer)); history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer }); }
        } catch (e) { wait.remove(); add('error', 'Connexion impossible. Vérifiez votre réseau puis réessayez.'); }
        send.disabled = input.disabled = false; input.focus();
    }
    form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });
    document.querySelectorAll('.mb-chip').forEach(b => b.addEventListener('click', () => ask(b.dataset.q)));
})();
</script>
@endsection
