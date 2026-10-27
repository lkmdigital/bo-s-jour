{{-- Mega Bo, flottant sur toutes les pages d'Ops (comme Bo sur le site) : bouton avec l'orbe, panneau de conversation.
     La conversation est gardée dans la session du navigateur : elle suit quand on change de page. --}}
@php
    $route = (string) request()->route()?->getName();
    $ctx = match (true) {
        str_starts_with($route, 'ops.audience') => 'audience',
        $route === 'ops.monitoring.incidents' => 'incidents',
        $route === 'ops.monitoring.errors' => 'errors',
        $route === 'ops.monitoring.settings' => 'alerts',
        str_starts_with($route, 'ops.monitoring') => 'supervision',
        str_starts_with($route, 'ops.payments') => 'payments',
        str_starts_with($route, 'ops.logs') => 'logs',
        $route === 'ops.dashboard' => 'dashboard',
        default => 'other',
    };
    $hints = [
        'audience' => ['Combien de visiteurs cette semaine ?', 'Quelles pages sont les plus consultées ?', "D'où viennent les visiteurs ?", 'Y a-t-il une tendance à la hausse ?'],
        'supervision' => ['La plateforme va-t-elle bien ?', 'Quels contrôles sont les plus lents ?', 'Quelle est la disponibilité cette semaine ?'],
        'incidents' => ['Résume les incidents de la semaine', 'Y a-t-il un incident en cours ?', 'Combien de temps faut-il pour les résoudre ?'],
        'errors' => ['Quelles erreurs reviennent le plus ?', 'Ces erreurs sont-elles graves ?', 'Que dois-je demander aux développeurs ?'],
        'alerts' => ['Quelles alertes ai-je reçues récemment ?', 'Que contient le rapport quotidien ?'],
        'payments' => ['Où en sont les paiements cette semaine ?', 'Y a-t-il des paiements bloqués ?'],
        'logs' => ['Quelles erreurs reviennent le plus ?', 'Y a-t-il un problème en ce moment ?'],
    ][$ctx] ?? ['Comment va la plateforme aujourd\'hui ?', 'Combien de visiteurs cette semaine ?', 'Où en sont les réservations et les paiements ?', 'Quelles actions me conseilles-tu ?'];
    $labels = ['audience' => "l'Audience", 'supervision' => 'la Supervision', 'incidents' => 'les Incidents', 'errors' => 'les Erreurs regroupées', 'alerts' => 'les Alertes', 'payments' => 'les Paiements', 'logs' => 'le Flux de logs', 'dashboard' => "la Vue d'ensemble", 'other' => 'cette page'];
    $available = \App\Services\AiModule::configured();
@endphp

@include('ops.mega-bo._send-report')
<template id="mbw-orb">@include('ops.mega-bo._orb', ['size' => 40])</template>

<style>
    .mbw-launcher { position:fixed; right:24px; bottom:24px; z-index:40; display:flex; align-items:center; gap:10px; padding:6px 20px 6px 6px; border:0; border-radius:999px; background:#fff; cursor:pointer;
        box-shadow:0 10px 30px -8px rgba(0,0,0,.45); outline:1px solid rgba(0,0,0,.06); transition:transform .2s ease, box-shadow .2s ease; animation:mbw-rise .5s cubic-bezier(.2,.8,.2,1) both; }
    .mbw-launcher:hover { transform:scale(1.04); box-shadow:0 14px 34px -8px rgba(0,0,0,.5); }
    .mbw-launcher:focus-visible { outline:3px solid #FF0000; outline-offset:3px; }
    .mbw-launcher small { display:block; font-size:11px; color:#6b7280; line-height:1.2; text-align:left; }
    .mbw-launcher b { display:block; font-size:14px; color:#111; line-height:1.25; text-align:left; }
    .mbw-panel { position:fixed; right:24px; bottom:24px; z-index:60; display:flex; flex-direction:column; overflow:hidden; background:#fff; width:26rem; height:min(42rem, calc(100dvh - 3rem));
        border:1px solid #e5e7eb; border-radius:24px; box-shadow:0 24px 60px -12px rgba(0,0,0,.35); transform-origin:bottom right; animation:mbw-open .26s cubic-bezier(.2,.8,.2,1) both; }
    .mbw-panel[hidden], .mbw-launcher[hidden] { display:none; }
    .mbw-head { display:flex; align-items:center; gap:10px; padding:12px; border-bottom:1px solid #f3f4f6; }
    .mbw-head h2 { font-size:16px; font-weight:700; line-height:1.2; margin:0; }
    .mbw-head p { margin:0; font-size:12px; color:#6b7280; display:flex; align-items:center; gap:6px; }
    .mbw-head p i { width:6px; height:6px; border-radius:50%; background:#059669; display:inline-block; }
    .mbw-icon { width:40px; height:40px; border:0; border-radius:50%; background:transparent; color:#374151; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; }
    .mbw-icon:hover { background:#f3f4f6; } .mbw-icon:focus-visible { outline:2px solid #FF0000; } .mbw-icon:disabled { opacity:.4; cursor:default; }
    .mbw-body { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; scroll-behavior:smooth; }
    .mbw-welcome { margin:auto; text-align:center; padding:8px 8px 4px; animation:mbw-fade .4s ease both; }
    .mbw-welcome .mbo { margin:0 auto; animation:mbw-float 4s ease-in-out infinite; }
    .mbw-welcome strong { display:block; margin-top:10px; font-size:20px; line-height:1.2; }
    .mbw-welcome p { margin:6px auto 0; font-size:13px; color:#4b5563; max-width:19rem; }
    .mbw-chips { display:flex; flex-direction:column; gap:8px; margin-top:16px; }
    .mbw-chip { border:1px solid #e5e7eb; background:#fff; border-radius:16px; padding:10px 14px; font-size:13px; font-weight:600; text-align:left; cursor:pointer; transition:border-color .15s, transform .15s; animation:mbw-fade .4s ease both; }
    .mbw-chip:hover { border-color:#111; transform:translateX(2px); } .mbw-chip:focus-visible { outline:2px solid #FF0000; }
    .mbw-row { display:flex; align-items:flex-end; gap:8px; animation:mbw-fade .28s ease both; }
    .mbw-row.user { justify-content:flex-end; }
    .mbw-msg { max-width:84%; padding:10px 14px; border-radius:18px; font-size:14px; line-height:1.5; overflow-wrap:anywhere; }
    .mbw-row.user .mbw-msg { background:#111; color:#fff; border-bottom-right-radius:5px; white-space:pre-wrap; }
    .mbw-row.bot .mbw-msg { background:#f3f4f6; color:#111; border-bottom-left-radius:5px; }
    .mbw-row.err .mbw-msg { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; border-bottom-left-radius:5px; }
    .mbw-msg p { margin:0; } .mbw-msg p + p, .mbw-msg p + ul, .mbw-msg ul + p { margin-top:8px; } .mbw-msg ul { margin:6px 0 6px 18px; list-style:disc; }
    .mbw-foot { display:flex; align-items:flex-end; gap:8px; padding:10px 12px 12px; border-top:1px solid #f3f4f6; }
    .mbw-foot textarea { flex:1; resize:none; min-height:46px; max-height:112px; border:1px solid transparent; background:#f3f4f6; border-radius:24px; padding:12px 16px; font-size:14px; outline:none; }
    .mbw-foot textarea:focus { border-color:#FF0000; }
    .mbw-send { width:46px; height:46px; flex-shrink:0; border:0; border-radius:50%; background:#FF0000; color:#fff; font-size:18px; cursor:pointer; transition:transform .15s; }
    .mbw-send:hover:not(:disabled) { transform:scale(1.07); } .mbw-send:disabled { opacity:.4; cursor:default; }
    .mbw-note { text-align:center; font-size:11px; color:#9ca3af; padding:0 12px 8px; }
    @keyframes mbw-rise { from { opacity:0; transform:translateY(16px) scale(.96); } to { opacity:1; transform:none; } }
    @keyframes mbw-open { from { opacity:0; transform:translateY(12px) scale(.92); } to { opacity:1; transform:none; } }
    @keyframes mbw-fade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    @keyframes mbw-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
    @media (max-width: 767px) {
        .mbw-launcher { right:12px; bottom:calc(16px + env(safe-area-inset-bottom)); padding-right:6px; } .mbw-launcher small, .mbw-launcher b { display:none; }
        .mbw-panel { inset:0; width:auto; height:auto; border:0; border-radius:0; }
    }
    @media (prefers-reduced-motion: reduce) { .mbw-launcher, .mbw-panel, .mbw-welcome, .mbw-welcome .mbo, .mbw-row, .mbw-chip { animation:none; } .mbw-chip, .mbw-launcher { transition:none; } .mbw-body { scroll-behavior:auto; } }
</style>

<button type="button" id="mbw-launcher" class="mbw-launcher" aria-label="Demandez à Mega Bo, l'assistant de l'espace Ops" aria-haspopup="dialog">
    <span data-orb="44"></span>
    <span><small>Une question ?</small><b>Demandez à Mega Bo</b></span>
</button>

<section id="mbw-panel" class="mbw-panel" role="dialog" aria-label="Mega Bo, l'assistant de l'espace Ops" hidden>
    <header class="mbw-head">
        <button type="button" class="mbw-icon" id="mbw-close" aria-label="Fermer la conversation avec Mega Bo">←</button>
        <span data-orb="40" id="mbw-head-orb"></span>
        <div style="flex:1;min-width:0"><h2>Mega Bo</h2><p><i></i> Assistant de l'espace Ops</p></div>
        <button type="button" class="mbw-icon" id="mbw-restart" aria-label="Nouvelle conversation" title="Nouvelle conversation" hidden>↺</button>
    </header>
    <div class="mbw-body" id="mbw-body" aria-live="polite"></div>
    <p class="mbw-note">Mega Bo peut se tromper : vérifiez les chiffres importants dans les pages Ops.</p>
    <form class="mbw-foot" id="mbw-form" autocomplete="off">
        <textarea id="mbw-input" rows="1" maxlength="1000" placeholder="Posez une question…" aria-label="Votre question à Mega Bo" {{ $available ? '' : 'disabled' }}></textarea>
        <button type="submit" class="mbw-send" id="mbw-send" aria-label="Envoyer" {{ $available ? '' : 'disabled' }}>➤</button>
    </form>
</section>

<script>
(() => {
    const URL_ASK = @json(route('ops.megabo.ask')), TOKEN = @json(csrf_token()), CONTEXT = @json($ctx),
          HINTS = @json($hints), PAGE = @json($labels[$ctx]), AVAILABLE = @json($available), KEY = 'mbo:chat:v1';
    const $ = id => document.getElementById(id);
    const launcher = $('mbw-launcher'), panel = $('mbw-panel'), body = $('mbw-body'), input = $('mbw-input'),
          send = $('mbw-send'), restart = $('mbw-restart'), tpl = $('mbw-orb');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let st = { open: false, messages: [] }, loading = false, foundTimer = null;
    try { st = Object.assign(st, JSON.parse(sessionStorage.getItem(KEY) || '{}')); } catch (e) {}
    const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ open: st.open, messages: st.messages.slice(-30) })); } catch (e) {} };

    const orb = (size, state) => { const s = tpl.content.firstElementChild.cloneNode(true); s.setAttribute('width', size); s.setAttribute('height', size); s.dataset.state = state || 'idle'; return s; };
    const setHeadState = state => { const h = $('mbw-head-orb').firstElementChild; if (h) h.dataset.state = state; };
    document.querySelectorAll('[data-orb]').forEach(el => el.appendChild(orb(+el.dataset.orb)));

    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Rendu minimal et sûr : le texte est échappé d'abord, puis seuls le gras, les listes et les paragraphes sont ajoutés.
    const md = text => esc(text).split(/\n{2,}/).map(b => {
        const lines = b.split('\n');
        return lines.every(l => /^\s*([-•*]|\d+\.)\s+/.test(l))
            ? '<ul>' + lines.map(l => '<li>' + l.replace(/^\s*([-•*]|\d+\.)\s+/, '') + '</li>').join('') + '</ul>'
            : '<p>' + lines.join('<br>') + '</p>';
    }).join('').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    function row(kind, html, state) {
        const r = document.createElement('div'); r.className = 'mbw-row ' + kind;
        if (kind !== 'user') r.appendChild(orb(26, state));
        const m = document.createElement('div'); m.className = 'mbw-msg'; m.innerHTML = html; r.appendChild(m);
        return r;
    }
    function welcome() {
        const w = document.createElement('div'); w.className = 'mbw-welcome';
        w.appendChild(orb(120));
        w.insertAdjacentHTML('beforeend', '<strong>Je suis Mega Bo</strong><p>' + (AVAILABLE
            ? 'Je lis la fréquentation, la santé de la plateforme et l\'activité. Posez-moi une question sur ' + esc(PAGE) + ' ou sur tout autre sujet.'
            : 'Je ne suis pas encore activé : la clé API Anthropic doit être renseignée dans l\'administration (Paramètres &gt; Réglages avancés).') + '</p>');
        if (AVAILABLE) {
            const chips = document.createElement('div'); chips.className = 'mbw-chips';
            HINTS.forEach((h, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mbw-chip'; b.textContent = h; b.style.animationDelay = (0.12 + i * 0.06) + 's'; b.onclick = () => ask(h); chips.appendChild(b); });
            w.appendChild(chips);
        }
        return w;
    }
    function render() {
        body.innerHTML = '';
        if (!st.messages.length) body.appendChild(welcome());
        st.messages.forEach((m, i) => {
            const r = row(m.role === 'user' ? 'user' : (m.error ? 'err' : 'bot'), m.role === 'user' ? esc(m.content) : md(m.content));
            if (m.action && m.action.type === 'send_report') {
                // Proposition d'envoi du rapport : l'état (en attente, envoyé, annulé) suit la conversation.
                r.querySelector('.mbw-msg').appendChild(window.mboSend.card(m.action, m.actionState, s => { m.actionState = s; save(); }));
            }
            if (i < st.messages.length - 1) r.style.animation = 'none'; // seul le dernier message apparaît en fondu
            body.appendChild(r);
        });
        restart.hidden = !st.messages.length;
        body.scrollTop = body.scrollHeight;
    }
    function setOpen(open, focus = true) {
        st.open = open; save(); panel.hidden = !open; launcher.hidden = open;
        if (open) { render(); if (focus && AVAILABLE) input.focus(); } else if (focus) launcher.focus();
    }
    async function ask(text) {
        text = (text || '').trim(); if (!text || loading || !AVAILABLE) return;
        const history = st.messages.filter(m => !m.error).slice(-10).map(m => ({ role: m.role, content: m.content }));
        st.messages.push({ role: 'user', content: text }); save();
        input.value = ''; input.style.height = 'auto'; loading = true; send.disabled = input.disabled = true;
        clearTimeout(foundTimer); setHeadState('thinking'); render();
        const wait = row('bot', '<span style="color:#6b7280">Mega Bo consulte les chiffres…</span>', 'thinking'); body.appendChild(wait); body.scrollTop = body.scrollHeight;
        let ok = false;
        try {
            const res = await fetch(URL_ASK, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': TOKEN }, body: JSON.stringify({ question: text, history, context: CONTEXT }) });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.answer) { st.messages.push({ role: 'assistant', content: data.answer, action: data.action || null }); ok = true; }
            else st.messages.push({ role: 'assistant', error: true, content: data.error || 'Mega Bo n\'a pas pu répondre. Réessayez dans un instant.' });
        } catch (e) { st.messages.push({ role: 'assistant', error: true, content: 'Connexion impossible. Vérifiez votre réseau puis réessayez.' }); }
        loading = false; send.disabled = input.disabled = false; save(); render(); input.focus();
        setHeadState(ok ? 'found' : 'idle');
        if (ok) foundTimer = setTimeout(() => setHeadState('idle'), reduced ? 0 : 2600);
    }

    launcher.onclick = () => setOpen(true);
    $('mbw-close').onclick = () => setOpen(false);
    restart.onclick = () => { if (loading) return; st.messages = []; save(); render(); };
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    $('mbw-form').onsubmit = e => { e.preventDefault(); ask(input.value); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 112) + 'px'; });

    if (st.open) setOpen(true, false);
})();
</script>
