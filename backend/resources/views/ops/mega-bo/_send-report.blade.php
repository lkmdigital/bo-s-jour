{{-- Envoi du rapport de Mega Bo à la demande : carte de confirmation partagée par la page Mega Bo (bouton et chat) et la bulle
     flottante. Rien ne part sans un clic sur « Confirmer l'envoi » ; les destinataires sont fixés côté serveur. --}}
@once
<style>
    .mbs-card { margin-top:10px; padding:12px 14px; background:#fff; border:1px solid #e5e7eb; border-left:4px solid #FF0000; border-radius:12px; font-size:13px; line-height:1.5; color:#111; text-align:left; }
    .mbs-card strong { display:block; font-size:14px; margin-bottom:2px; }
    .mbs-card p { margin:0 0 10px; color:#4b5563; }
    .mbs-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .mbs-btn { border:0; border-radius:10px; padding:8px 14px; font-size:13px; font-weight:700; cursor:pointer; }
    .mbs-btn.go { background:#FF0000; color:#fff; } .mbs-btn.go:hover { background:#d90000; }
    .mbs-btn.no { background:#f3f4f6; color:#374151; } .mbs-btn.no:hover { background:#e5e7eb; }
    .mbs-btn:focus-visible { outline:2px solid #111; outline-offset:2px; }
    .mbs-status { margin:0; font-size:13px; }
    .mbs-status.ok { color:#047857; } .mbs-status.err { color:#b91c1c; } .mbs-status.wait { color:#4b5563; }
    .mbs-status a { text-decoration:underline; }
    .mbs-spin { display:inline-block; width:11px; height:11px; margin-right:6px; border:2px solid #d1d5db; border-top-color:#FF0000; border-radius:50%; animation:mbs-r .8s linear infinite; vertical-align:-1px; }
    @keyframes mbs-r { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .mbs-spin { animation:none; } }
</style>
<script>
window.mboSend = (() => {
    const URL_SEND = @json(route('ops.megabo.send')), TOKEN = @json(csrf_token());
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safeUrl = u => (typeof u === 'string' && u.startsWith(location.origin + '/')) ? u : null;

    async function run(audience) {
        try {
            const res = await fetch(URL_SEND, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': TOKEN }, body: JSON.stringify({ audience }) });
            const data = await res.json().catch(() => ({}));
            if (res.status === 419) return { ok: false, error: 'La session a expiré : rechargez la page, puis recommencez.' };
            if (res.status === 429) return { ok: false, error: 'Trop de demandes rapprochées : patientez une minute.' };
            return Object.assign({ ok: false, error: "L'envoi a échoué. Réessayez dans un instant." }, data);
        } catch (e) { return { ok: false, error: 'Connexion impossible (ou délai dépassé) : vérifiez dans la liste des rapports si le message est parti avant de réessayer.' }; }
    }

    /**
     * Carte « Envoyer le rapport du jour ». action : { audience, summary } ; state : état déjà résolu à restaurer
     * ({ kind: 'ok'|'cancelled', html }) ; persist(state) : appelé quand l'état change ; onCancel : remplace le message « annulé ».
     */
    function card(action, state, persist, onCancel) {
        const el = document.createElement('div'); el.className = 'mbs-card';
        const status = (kind, html) => { el.innerHTML = '<p class="mbs-status ' + kind + '">' + html + '</p>'; };
        const resolved = (kind, html) => { status(kind === 'ok' ? 'ok' : 'wait', html); persist && persist({ kind, html }); };

        function ask() {
            el.innerHTML = '<strong>Envoyer le rapport du jour</strong><p>Il partira ' + esc(action.summary) + '. Mega Bo le rédige à l\'instant (jusqu\'à une minute).</p>'
                + '<div class="mbs-actions"><button type="button" class="mbs-btn go">Confirmer l\'envoi</button><button type="button" class="mbs-btn no">Annuler</button></div>';
            el.querySelector('.go').onclick = go;
            el.querySelector('.no').onclick = () => onCancel ? onCancel() : resolved('cancelled', 'Envoi annulé.');
            if (el.querySelector('.go')) el.querySelector('.go').focus?.();
        }
        async function go() {
            status('wait', '<span class="mbs-spin"></span>Mega Bo rédige et envoie le rapport…');
            const r = await run(action.audience);
            if (r.ok) {
                const link = safeUrl(r.url) ? ' <a href="' + esc(r.url) + '">Voir le rapport</a>' : '';
                resolved('ok', '✓ Rapport envoyé (' + (+r.sent || 0) + ' message' + (r.sent > 1 ? 's' : '') + ').' + link + (r.left != null ? ' Il reste ' + r.left + ' envoi' + (r.left > 1 ? 's' : '') + ' manuel' + (r.left > 1 ? 's' : '') + ' aujourd\'hui.' : ''));
            } else {
                const link = safeUrl(r.url) ? ' <a href="' + esc(r.url) + '">Voir le rapport</a>' : '';
                el.innerHTML = '<p class="mbs-status err">' + esc(r.error) + link + '</p><div class="mbs-actions" style="margin-top:8px"><button type="button" class="mbs-btn go">Réessayer</button></div>';
                el.querySelector('.go').onclick = go;
            }
        }

        if (state && state.html) status(state.kind === 'ok' ? 'ok' : 'wait', state.html); else ask();
        return el;
    }

    return { card };
})();
</script>
@endonce
