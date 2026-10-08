#!/usr/bin/env python3
"""Génère le guide client « Créer les modèles WhatsApp » (PDF + fichier texte à copier-coller).

    python3 build.py

Sources de vérité : les 5 modèles ci-dessous. Ils doivent rester alignés sur
backend/app/Services/WhatsAppService.php (noms TPL_*, ordre des variables {{1}}…)
et sur les pages ouvertes par les boutons (frontend/app/paiement/[token],
frontend/app/retrouver-reservation, frontend/app/dashboard/host/bookings/requests).

Produit : Guide_WhatsApp_BoSejour_Client_v2.pdf et Textes_Modeles_WhatsApp_BoSejour.txt
(PDF rendu par Google Chrome en mode headless : emojis et polices de la charte OK).
"""
import base64
import html
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
SITE = 'https://bosejour.ci'

# ─── Les 5 modèles ─────────────────────────────────────────────────────────

MODELS = [
    {
        'n': 1,
        'name': 'bosejour_demande_recue',
        'category': 'Utilitaire',
        'category_en': 'Utility',
        'when': 'Au voyageur, dès qu’il envoie sa demande de réservation',
        'body': (
            'Votre demande de réservation a bien été enregistrée !\n\n'
            'Merci d’avoir choisi *boséjour*.\n\n'
            'Votre demande a été transmise à l’établissement pour confirmation de disponibilité.\n\n'
            'Dès validation, vous recevrez votre confirmation de disponibilité ainsi qu’un lien de paiement sécurisé pour finaliser votre réservation.\n\n'
            'Encore quelques instants… votre séjour prend déjà forme.'
        ),
        'samples': [],
        'footer': 'boséjour — Votre séjour commence ici...',
        'button': None,
        'tips': ['Les astérisques autour de *boséjour* mettent le mot en gras : recopiez-les.'],
    },
    {
        'n': 2,
        'name': 'bosejour_nouvelle_demande',
        'category': 'Utilitaire',
        'category_en': 'Utility',
        'when': 'Au partenaire (hébergeur), quand une demande est à confirmer',
        'body': (
            'Nouvelle demande de réservation 📩\n\n'
            'Établissement : {{1}}\n'
            'Séjour demandé : du {{2}} au {{3}}\n\n'
            'Merci de confirmer la disponibilité avant le {{4}} depuis votre espace partenaire, sinon la demande sera annulée automatiquement.'
        ),
        'samples': [('{{1}}', 'Résidence Le Balafon'), ('{{2}}', '12/10/2026'), ('{{3}}', '15/10/2026'), ('{{4}}', '25/09/2026 à 18:30')],
        'footer': 'boséjour — Espace partenaire',
        'button': {
            'kind': 'static',
            'text': 'Répondre à la demande',
            'url': f'{SITE}/dashboard/host/bookings/requests',
        },
        'tips': ['L’emoji 📩 (enveloppe avec flèche) se trouve dans le sélecteur d’emojis de Meta, ou se copie depuis le fichier texte.'],
    },
    {
        'n': 3,
        'name': 'bosejour_demande_acceptee',
        'category': 'Utilitaire',
        'category_en': 'Utility',
        'when': 'Au voyageur, quand le partenaire a confirmé la disponibilité (lien de paiement)',
        'body': (
            'Votre demande est acceptée ✅\n\n'
            'Établissement : {{1}}\n'
            'Séjour : du {{2}} au {{3}}\n\n'
            'Il ne reste plus qu’à régler votre séjour pour finaliser votre réservation. Utilisez le bouton ci-dessous pour payer en toute sécurité.'
        ),
        'samples': [('{{1}}', 'Résidence Le Balafon'), ('{{2}}', '12/10/2026'), ('{{3}}', '15/10/2026')],
        'footer': 'boséjour — Votre séjour commence ici...',
        'button': {
            'kind': 'dynamic',
            'text': 'Payer ma réservation',
            'url': f'{SITE}/paiement/{{{{1}}}}',
            'sample_url': f'{SITE}/paiement/k3Jd9xQ2LmA7',
            'sample_var': 'k3Jd9xQ2LmA7',
        },
        'tips': [
            'C’est le seul modèle avec un bouton à lien <b>dynamique</b> : le site ajoute lui-même, à la fin du lien, le code propre à chaque réservation.',
        ],
    },
    {
        'n': 4,
        'name': 'bosejour_reservation_confirmee',
        'category': 'Utilitaire',
        'category_en': 'Utility',
        'when': 'Au voyageur, une fois le paiement reçu',
        'body': (
            'Réservation confirmée ✅\n\n'
            'Établissement : {{1}}\n'
            'N° de réservation : {{2}}\n'
            'Code de confirmation, à présenter à l’arrivée : {{3}}\n'
            'Séjour : du {{4}} au {{5}}\n\n'
            'Merci et bon séjour !'
        ),
        'samples': [('{{1}}', 'Résidence Le Balafon'), ('{{2}}', 'BS-2026-000115'), ('{{3}}', '7F3A9C21'), ('{{4}}', '12/10/2026'), ('{{5}}', '15/10/2026')],
        'footer': 'boséjour — Votre séjour commence ici...',
        'button': {
            'kind': 'static',
            'text': 'Voir ma réservation',
            'url': f'{SITE}/retrouver-reservation',
        },
        'tips': [],
    },
]

AUTH = {
    'n': 5,
    'name': 'bosejour_code_verification',
    'category': 'Authentification',
    'category_en': 'Authentication',
    'when': 'Au voyageur, pour vérifier son numéro de téléphone',
}

LANG_FR = 'Français (code « fr »)'


# ─── Utilitaires de rendu ──────────────────────────────────────────────────

def esc(s: str) -> str:
    return html.escape(s, quote=False)


def hl_vars(s: str) -> str:
    """Échappe puis surligne les variables {{n}}."""
    out = esc(s)
    for i in range(1, 6):
        out = out.replace('{{%d}}' % i, '<span class="var">{{%d}}</span>' % i)
    return out


def body_html(text: str) -> str:
    return hl_vars(text).replace('\n', '<br>')


def bubble(model: dict) -> str:
    """Aperçu façon WhatsApp avec les valeurs d’exemple."""
    text = model['body']
    for ph, val in model['samples']:
        text = text.replace(ph, val)
    out = esc(text).replace('\n', '<br>')
    # gras *mot*
    import re
    out = re.sub(r'\*([^*<]+)\*', r'<b>\1</b>', out)
    btn = ''
    if model['button']:
        btn = f'<div class="wa-btn">↗ {esc(model["button"]["text"])}</div>'
    foot = f'<div class="wa-foot">{esc(model["footer"])}</div>' if model['footer'] else ''
    return f'<div class="wa"><div class="wa-bubble">{out}{foot}<div class="wa-time">10:42</div></div>{btn}</div>'


def row(label_fr: str, label_en: str, value_html: str, mono: bool = False) -> str:
    cls = ' class="mono"' if mono else ''
    return (
        f'<tr><td class="lbl">{label_fr}<small>{label_en}</small></td>'
        f'<td{cls}>{value_html}</td></tr>'
    )


def model_page(m: dict) -> str:
    rows = [
        row('Nom du modèle', 'Name', f'<b class="copy">{m["name"]}</b><small class="note">minuscules et tirets bas, exactement comme ci-contre — impossible à changer ensuite</small>'),
        row('Catégorie', 'Category', f'<b>{m["category"]}</b> <span class="muted">({m["category_en"]})</span>'),
        row('Langue', 'Language', f'<b>{LANG_FR}</b>'),
        row('En-tête', 'Header', '<span class="muted">Aucun — laissez vide</span>'),
        row('Corps du message', 'Body', f'<div class="msg">{body_html(m["body"])}</div>'),
    ]
    if m['samples']:
        s = ''.join(f'<tr><td><span class="var">{k}</span></td><td>{esc(v)}</td></tr>' for k, v in m['samples'])
        rows.append(row(
            'Exemples des variables',
            'Samples / Content examples',
            f'<table class="mini"><tr><th>Variable</th><th>À saisir comme exemple</th></tr>{s}</table>'
            '<small class="note">Meta refuse le modèle si un exemple manque.</small>',
        ))
    else:
        rows.append(row('Exemples des variables', 'Samples', '<span class="muted">Aucune variable dans ce modèle : rien à saisir.</span>'))
    rows.append(row('Pied de page', 'Footer', f'<b class="copy">{esc(m["footer"])}</b>'))

    b = m['button']
    if not b:
        rows.append(row('Boutons', 'Buttons', '<span class="muted">Aucun — laissez vide</span>'))
    else:
        parts = [
            '<b>Appel à l’action → Visiter le site</b> <span class="muted">(Call to action → Visit website)</span>',
            f'Texte du bouton : <b class="copy">{esc(b["text"])}</b>',
        ]
        if b['kind'] == 'static':
            parts.append('Type d’URL : <b>Statique</b> <span class="muted">(Static)</span>')
            parts.append(f'URL du site : <b class="copy">{b["url"]}</b>')
        else:
            parts.append('Type d’URL : <b>Dynamique</b> <span class="muted">(Dynamic)</span>')
            parts.append(f'URL du site : <b class="copy">{esc(b["url"]).replace("{{1}}", "<span class=var>{{1}}</span>")}</b>')
            parts.append(
                f'Exemple d’URL : <b class="copy">{b["sample_url"]}</b>'
                f'<small class="note">Meta demande une adresse <u>complète</u>, pas seulement la fin. '
                f'Si votre écran ne propose qu’un champ pour la variable, saisissez <b>{b["sample_var"]}</b>.</small>'
            )
        rows.append(row('Boutons', 'Buttons', '<br>'.join(parts)))

    tips = ''.join(f'<li>{t}</li>' for t in m['tips'])
    tips_html = f'<ul class="tips">{tips}</ul>' if tips else ''
    return f'''
<section class="page model">
  <div class="model-head">
    <span class="num">{m["n"]}</span>
    <div><h2>{m["name"]}</h2><p>{esc(m["when"])}</p></div>
    <span class="tag {'tag-auth' if m['category_en']=='Authentication' else ''}">{m["category"]}</span>
  </div>
  <table class="form">{''.join(rows)}</table>
  <div class="preview">
    <div class="preview-txt"><h3>Ce que recevra le destinataire</h3>
      <p>Aperçu avec les exemples ci-dessus. Si l’aperçu de Meta ressemble à ceci, le modèle est bon.</p>{tips_html}</div>
    {bubble(m)}
  </div>
</section>'''


def auth_page(m: dict) -> str:
    return f'''
<section class="page model">
  <div class="model-head">
    <span class="num">{m["n"]}</span>
    <div><h2>{m["name"]}</h2><p>{esc(m["when"])}</p></div>
    <span class="tag tag-auth">{m["category"]}</span>
  </div>
  <div class="callout info"><b>Celui-ci est le plus simple :</b> Meta impose le texte. Vous ne rédigez rien, vous cochez des options.</div>
  <table class="form">
    {row('Nom du modèle', 'Name', f'<b class="copy">{m["name"]}</b>')}
    {row('Catégorie', 'Category', '<b>Authentification</b> <span class="muted">(Authentication)</span>')}
    {row('Langue', 'Language', f'<b>{LANG_FR}</b>')}
    {row('Type de code', 'Code delivery setup', '<b>Copier le code</b> <span class="muted">(Copy code)</span><small class="note">le bouton qui copie le code en un clic. Ne choisissez pas « saisie automatique » (réservée à Android).</small>')}
    {row('Durée d’expiration du code', 'Code expiration time', '<b>Cochez l’option</b> et indiquez <b>10 minutes</b>')}
    {row('Recommandation de sécurité', 'Security recommendation', '<span class="muted">Au choix.</span> Décochée, le message est plus court.')}
  </table>
  <div class="preview">
    <div class="preview-txt"><h3>Ce que recevra le voyageur</h3>
      <p>Meta génère ce message automatiquement. Il n’y a rien d’autre à écrire.</p></div>
    <div class="wa"><div class="wa-bubble"><b>482 916</b> est votre code de vérification.<div class="wa-foot">Ce code expire dans 10 minutes.</div><div class="wa-time">10:42</div></div><div class="wa-btn">⧉ Copier le code</div></div>
  </div>
</section>'''


def txt_file() -> str:
    lines = [
        'BoSéjour — Textes des modèles WhatsApp à copier-coller',
        '=' * 56,
        'Copiez chaque bloc tel quel (apostrophes ’ et emojis compris) dans le champ',
        'indiqué de Meta. Les variables {{1}}, {{2}}… se recopient telles quelles.',
        'Langue de chaque modèle : Français (code « fr »).',
        '',
    ]
    for m in MODELS:
        lines += [
            '-' * 56,
            f'MODÈLE {m["n"]} — nom : {m["name"]}   (catégorie : {m["category"]})',
            '-' * 56,
            '',
            '>>> CORPS DU MESSAGE',
            m['body'],
            '',
        ]
        if m['samples']:
            lines.append('>>> EXEMPLES DES VARIABLES')
            lines += [f'{k} = {v}' for k, v in m['samples']]
            lines.append('')
        lines += ['>>> PIED DE PAGE', m['footer'], '']
        if m['button']:
            b = m['button']
            lines += ['>>> BOUTON (Appel à l’action → Visiter le site)', f'Texte : {b["text"]}']
            if b['kind'] == 'static':
                lines += ['Type d’URL : Statique', f'URL : {b["url"]}']
            else:
                lines += ['Type d’URL : Dynamique', f'URL : {b["url"]}', f'Exemple d’URL : {b["sample_url"]}']
            lines.append('')
    lines += [
        '-' * 56,
        f'MODÈLE 5 — nom : {AUTH["name"]}   (catégorie : Authentification)',
        '-' * 56,
        'Aucun texte à copier : Meta impose le message.',
        'Options : type de code « Copier le code » ; durée d’expiration 10 minutes.',
        '',
    ]
    return '\n'.join(lines)


# ─── Document ──────────────────────────────────────────────────────────────

CSS = '''
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;0,800;1,700&display=swap');
@page { size: A4; margin: 16mm 15mm 18mm; @bottom-left { content: "BoSéjour · Guide WhatsApp · v2"; font: 8pt 'DM Sans', sans-serif; color: #999; }
        @bottom-right { content: counter(page) " / " counter(pages); font: 8pt 'DM Sans', sans-serif; color: #999; } }
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
:root { --red:#FF0000; --ink:#111; --gray:#4B5F5A; --beige:#F7E8C6; --line:#e7e2d8; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; color: var(--ink); font-size: 10.2pt; line-height: 1.45; margin: 0; }
h1,h2,h3 { margin: 0; line-height: 1.12; letter-spacing: -0.01em; }
h2 { font-size: 19pt; font-weight: 800; }
h3 { font-size: 11.5pt; font-weight: 700; margin-bottom: 4px; }
p { margin: 0 0 8px; }
.page { page-break-after: always; break-after: page; }
.page.model { zoom: .95; }
table.plain td .copy { white-space: nowrap; font-size: 8.2pt; word-break: normal; }
.preview { break-inside: avoid; }
.page:last-child { page-break-after: auto; break-after: auto; }
small { display: block; font-size: 8pt; color: #777; font-weight: 400; }
.muted { color: #888; font-weight: 400; }
u { text-decoration-color: var(--red); text-underline-offset: 2px; }

/* Couverture */
.cover { height: 297mm; background: linear-gradient(135deg, #000 42%, #4a0000 72%, #ff0000 100%); color: #fff; padding: 22mm 20mm; position: relative; page-break-after: always; break-after: page; }
.cover .logo { background:#fff; border-radius: 14px; padding: 10px 16px; display:inline-block; }
.cover .logo img { height: 34px; display:block; }
.cover h1 { font-size: 36pt; font-weight: 800; margin-top: 62mm; max-width: 150mm; }
.cover h1 em { font-style: normal; color: #ff6a6a; }
.cover .sub { font-size: 14pt; margin-top: 8mm; max-width: 140mm; opacity: .92; }
.cover .meta { position:absolute; left: 20mm; bottom: 22mm; font-size: 10pt; opacity: .85; line-height: 1.6; }
.cover .pill { display:inline-block; border:1.5px solid rgba(255,255,255,.55); border-radius: 99px; padding: 3px 12px; margin: 14mm 6px 0 0; font-size: 10pt; }

/* En-tête de section */
.kicker { color: var(--red); font-weight: 800; letter-spacing: .14em; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 4px; }
.lead { font-size: 11.5pt; color: #333; margin: 6px 0 12px; }

/* Cartes & encadrés */
.grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid3 { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.card { border:1.5px solid var(--line); border-radius: 12px; padding: 12px 14px; background:#fff; }
.card.hl { border-color: var(--red); background: #fff6f6; }
.card .big { font-size: 22pt; font-weight: 800; color: var(--red); line-height: 1; margin-bottom: 4px; }
.callout { border-radius: 10px; padding: 9px 12px; margin: 10px 0; font-size: 9.6pt; }
.callout.info { background: #eef4f2; border-left: 4px solid var(--gray); }
.callout.warn { background: #fff4e0; border-left: 4px solid #e69500; }
.callout.bad { background: #fdeaea; border-left: 4px solid var(--red); }
.callout.ok { background: #e9f6ec; border-left: 4px solid #1a9a4a; }

/* Étapes */
.steps { list-style: none; counter-reset: s; padding: 0; margin: 8px 0; }
.steps li { counter-increment: s; position: relative; padding: 4px 0 8px 36px; }
.steps li::before { content: counter(s); position:absolute; left:0; top:2px; width: 24px; height:24px; border-radius: 50%; background: var(--red); color:#fff; font-weight:800; font-size: 10pt; display:flex; align-items:center; justify-content:center; }
.chk { list-style:none; padding:0; margin: 6px 0; }
.chk li { padding: 3px 0 3px 26px; position:relative; }
.chk li::before { content:""; position:absolute; left:0; top:5px; width:14px; height:14px; border:2px solid var(--gray); border-radius: 4px; }

/* Tables génériques */
table { border-collapse: collapse; width: 100%; }
table.plain th { text-align:left; background: var(--beige); font-size: 9pt; padding: 6px 9px; }
table.plain td { padding: 6px 9px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 9.6pt; }
code, .copy { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 9pt; background: #f3f1ec; padding: 1px 5px; border-radius: 4px; word-break: break-all; }
.copy { font-weight: 600; background: #fff0f0; color: #a00000; }

/* Fiche modèle */
.model-head { display:flex; align-items:center; gap: 12px; margin-bottom: 10px; }
.model-head .num { width: 40px; height: 40px; flex: none; border-radius: 12px; background:#000; color:#fff; font-weight:800; font-size: 18pt; display:flex; align-items:center; justify-content:center; }
.model-head h2 { font-size: 15pt; font-family: 'SF Mono', Menlo, monospace; letter-spacing: 0; }
.model-head p { margin: 2px 0 0; color: #555; font-size: 9.4pt; }
.tag { margin-left:auto; flex:none; background: var(--beige); border-radius: 99px; padding: 3px 12px; font-weight: 700; font-size: 9pt; }
.tag-auth { background: #dfe9f7; }
table.form { border: 1.5px solid var(--line); border-radius: 12px; overflow: hidden; }
table.form td { padding: 8px 11px; border-bottom: 1px solid var(--line); vertical-align: top; }
table.form tr:last-child td { border-bottom: 0; }
table.form td.lbl { width: 31%; background: #faf8f3; font-weight: 700; font-size: 9.4pt; }
table.form td.lbl small { font-weight: 400; }
.note { margin-top: 3px; }
.msg { background: #f7f6f2; border: 1px dashed #cfc8b8; border-radius: 8px; padding: 9px 11px; font-size: 9.6pt; line-height: 1.5; }
.var { background: #fff1b8; border-radius: 4px; padding: 0 3px; font-family: 'SF Mono', Menlo, monospace; font-weight: 600; }
table.mini { margin-top: 2px; }
table.mini th { text-align:left; font-size: 8pt; color:#888; font-weight:600; padding: 2px 6px 3px 0; }
table.mini td { padding: 2px 8px 2px 0; font-size: 9.4pt; border: 0; }
.tips { margin: 6px 0 0; padding-left: 16px; font-size: 9pt; color: #444; }

/* Aperçu WhatsApp */
.preview { display:grid; grid-template-columns: 1fr 250px; gap: 14px; align-items:start; margin-top: 12px; }
.preview-txt p { color:#555; font-size: 9.4pt; }
.wa { background: #e6ddd4; border-radius: 14px; padding: 12px; }
.wa-bubble { background:#fff; border-radius: 10px 10px 10px 2px; padding: 8px 10px 4px; font-size: 8.6pt; line-height: 1.4; box-shadow: 0 1px 1px rgba(0,0,0,.12); }
.wa-foot { color: #8a8a8a; font-size: 7.4pt; margin-top: 5px; }
.wa-time { text-align:right; font-size: 6.8pt; color:#9a9a9a; margin-top: 1px; }
.wa-btn { margin-top: 4px; background:#fff; border-radius: 10px; text-align:center; padding: 6px; color: #027eb5; font-weight: 600; font-size: 8.6pt; box-shadow: 0 1px 1px rgba(0,0,0,.12); }

/* Schéma d'écran */
.screen { border: 1.5px solid #cfc8b8; border-radius: 12px; background:#faf9f6; padding: 14px; display:grid; grid-template-columns: 1fr 120px; gap: 12px; margin: 10px 0 6px; }
.field { background:#fff; border:1px solid #d8d3c6; border-radius: 8px; padding: 6px 10px 6px 34px; margin-bottom: 7px; position:relative; font-size: 9pt; min-height: 30px; }
.field b { display:block; font-size: 7.6pt; color:#888; font-weight:600; }
.field .pin { position:absolute; left: 7px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius:50%; background: var(--red); color:#fff; font-size: 8.6pt; font-weight:800; display:flex; align-items:center; justify-content:center; }
.field.tall { min-height: 66px; }
.screen .side { background:#e6ddd4; border-radius: 10px; padding: 8px; font-size: 7.6pt; color:#555; text-align:center; }

.err td:first-child { font-weight: 700; }
.sig { margin-top: 10px; }
.status { display:inline-block; border-radius: 99px; padding: 1px 10px; font-weight: 700; font-size: 8.8pt; }
.s-ok { background:#dff3e5; color:#157a3b; } .s-wait { background:#fff1c9; color:#8a6100; } .s-no { background:#fddede; color:#b00000; } .s-pause{ background:#e8e8e8; color:#555; }
'''


def doc(logo_b64: str) -> str:
    models = ''.join(model_page(m) for m in MODELS) + auth_page(AUTH)

    overview_rows = ''.join(
        f'<tr><td><b>{m["n"]}</b></td><td><span class="copy">{m["name"]}</span></td><td>{m["category"]}</td><td>{esc(m["when"])}</td></tr>'
        for m in MODELS + [AUTH]
    )

    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>BoSéjour — Guide WhatsApp (v2)</title><style>{CSS}</style></head><body>

<!-- ─── Couverture ─── -->
<section class="cover">
  <span class="logo"><img src="data:image/png;base64,{logo_b64}" alt="bo séjour"></span>
  <h1>Créer les modèles de message <em>WhatsApp</em></h1>
  <p class="sub">Guide pas à pas, avec les textes à copier et les erreurs à éviter.</p>
  <span class="pill">5 modèles</span><span class="pill">≈ 45 minutes</span><span class="pill">Version 2 · 2 octobre 2026</span>
  <div class="meta">À l’attention de HCS Consulting<br>Plateforme BoSéjour · bosejour.ci</div>
</section>

<!-- ─── 1. L’essentiel ─── -->
<section class="page">
  <div class="kicker">Avant de commencer</div>
  <h2>L’essentiel en une page</h2>
  <p class="lead">BoSéjour envoie des messages WhatsApp à vos voyageurs et à vos partenaires. Pour <b>écrire en premier</b>, WhatsApp impose des messages-types validés à l’avance par Meta : les <b>modèles</b>. Ce guide vous montre comment les créer.</p>

  <div class="grid3">
    <div class="card"><div class="big">1</div><b>Préparer</b><br>Compte Meta vérifié, numéro dédié, moyen de paiement.</div>
    <div class="card"><div class="big">2</div><b>Créer 5 modèles</b><br>On recopie les textes fournis. Un par un, une fiche par modèle.</div>
    <div class="card"><div class="big">3</div><b>Nous transmettre 4 éléments</b><br>Identifiants et confirmation « Approuvé ».</div>
  </div>

  <h3 style="margin-top:16px">Deux façons de procéder</h3>
  <div class="grid2">
    <div class="card hl">
      <b>A — Vous nous donnez l’accès (recommandé)</b>
      <p style="margin-top:4px">Vous ajoutez notre développeur comme administrateur : <b>il crée les 5 modèles et la clé d’accès à votre place</b>. Il vous reste seulement à valider le numéro et le moyen de paiement. Environ 10 minutes pour vous.</p>
      <p class="muted" style="margin:0">→ Voir « Option A » et « Ce qu’il faut nous transmettre ».</p>
    </div>
    <div class="card">
      <b>B — Vous créez les modèles vous-même</b>
      <p style="margin-top:4px">Suivez « Option B » : une fiche par modèle, avec chaque champ à remplir. Prévoyez environ 45 minutes, plus le délai de validation de Meta (de quelques minutes à 24 h).</p>
      <p class="muted" style="margin:0">→ Voir « Option B ».</p>
    </div>
  </div>

  <div class="callout warn"><b>Si vous bloquez, ne perdez pas de temps :</b> passez à l’option A. Les deux étapes qui bloquent le plus souvent sont la vérification de l’entreprise par Meta et la création de la clé d’accès permanente (elle demande une « application » Meta).</div>

  <h3 style="margin-top:12px">Les 5 modèles à créer</h3>
  <table class="plain"><tr><th style="width:4%">#</th><th style="width:37%">Nom (à recopier exactement)</th><th style="width:15%">Catégorie</th><th>Quand il est envoyé</th></tr>{overview_rows}</table>
</section>

<!-- ─── 2. Préparer ─── -->
<section class="page">
  <div class="kicker">Étape 1</div>
  <h2>Préparer le terrain</h2>
  <p class="lead">Ces trois éléments sont indispensables, et le premier prend le plus de temps : <b>lancez-le aujourd’hui</b>.</p>
  <table class="plain">
    <tr><th style="width:30%">Il vous faut</th><th>Détails</th></tr>
    <tr><td><b>1. Un compte Meta Business vérifié</b></td><td>Au nom de HCS Consulting, sur <b>business.facebook.com</b>. La vérification demande les documents de l’entreprise et peut prendre <b>plusieurs jours</b>. Tant qu’elle n’est pas terminée, certaines fonctions restent limitées.</td></tr>
    <tr><td><b>2. Un numéro dédié à BoSéjour</b></td><td>Un numéro qui n’est <b>pas déjà utilisé</b> sur l’application WhatsApp ou WhatsApp Business (sinon il faut d’abord le désinscrire). Il doit pouvoir recevoir un <b>SMS ou un appel</b> pour être validé.</td></tr>
    <tr><td><b>3. Un moyen de paiement</b></td><td>Enregistré dans Meta Business (<i>Paramètres → Facturation</i>). Meta facture directement les messages envoyés aux clients.</td></tr>
  </table>
  <div class="callout info"><b>Bon à savoir :</b> les messages « Utilitaire » (confirmation, lien de paiement…) coûtent moins cher que les messages « Marketing ». C’est pourquoi les textes de ce guide ne contiennent aucune promotion : n’en ajoutez pas.</div>

  <h3 style="margin-top:14px">Comment ouvrir l’outil des modèles</h3>
  <ol class="steps">
    <li>Connectez-vous à <b>business.facebook.com</b> avec un compte administrateur.</li>
    <li>Ouvrez le <b>Gestionnaire WhatsApp</b> <span class="muted">(WhatsApp Manager)</span>. Vous ne le trouvez pas ? Utilisez la barre de recherche de Meta Business Suite et tapez « WhatsApp ».</li>
    <li>Dans le menu de gauche, cliquez sur <b>Modèles de messages</b> <span class="muted">(Message templates)</span>, puis sur le bouton <b>Créer un modèle</b> <span class="muted">(Create template)</span>.</li>
  </ol>
  <div class="callout info">Meta change régulièrement le nom de certains boutons et la langue de l’interface suit celle de votre compte. Nous indiquons donc le libellé français <b>et</b> l’anglais entre parenthèses.</div>
</section>

<!-- ─── 3. Option A ─── -->
<section class="page">
  <div class="kicker">Option A · la plus simple</div>
  <h2>Nous donner l’accès</h2>
  <p class="lead">Vous ne créez rien : notre développeur s’occupe de toute la partie technique. Vous gardez le contrôle et pouvez retirer son accès à tout moment.</p>
  <ol class="steps">
    <li>Ouvrez <b>business.facebook.com</b> → <b>Paramètres de l’entreprise</b> <span class="muted">(Business settings)</span> → <b>Utilisateurs → Personnes</b> <span class="muted">(Users → People)</span>.</li>
    <li>Cliquez sur <b>Ajouter</b>, saisissez l’<b>adresse e-mail que nous vous communiquons</b> et donnez l’accès <b>Administrateur</b>.</li>
    <li>Toujours dans les paramètres : <b>Comptes → Comptes WhatsApp</b> <span class="muted">(Accounts → WhatsApp accounts)</span>. Sélectionnez votre compte, cliquez sur <b>Ajouter des personnes</b>, choisissez notre développeur et activez le <b>contrôle total</b>.</li>
    <li>Validez votre <b>numéro dédié</b> (Meta envoie un code par SMS ou par appel) et vérifiez que votre <b>moyen de paiement</b> est enregistré.</li>
    <li>Prévenez-nous : nous créons les 5 modèles, vous n’avez plus qu’à contrôler qu’ils sont « Approuvés ».</li>
  </ol>
  <div class="callout ok"><b>Ce que nous ne pouvons pas faire à votre place :</b> la vérification de l’entreprise, la validation du numéro par SMS et l’enregistrement du moyen de paiement. Ces trois actions doivent venir de vous.</div>
  <div class="callout info">Vous préférez créer les modèles vous-même ? Continuez avec la section suivante, « Option B ».</div>
</section>

<!-- ─── 4. Règles + schéma ─── -->
<section class="page">
  <div class="kicker">Option B · créer les modèles vous-même</div>
  <h2>Les règles à respecter</h2>
  <p class="lead">La grande majorité des refus viennent d’une de ces six règles.</p>
  <table class="plain err">
    <tr><th style="width:5%"></th><th style="width:46%">À faire</th><th>À éviter</th></tr>
    <tr><td>1</td><td><b>Langue :</b> choisir <b>Français</b> (code « fr ») pour chaque modèle.</td><td>Une autre variante du français : le site cherche le modèle en « fr » et ne le trouverait pas.</td></tr>
    <tr><td>2</td><td><b>Nom :</b> recopier le nom indiqué, en minuscules avec des tirets bas.</td><td>Majuscules, espaces, accents. Le nom ne peut plus être modifié.</td></tr>
    <tr><td>3</td><td><b>Catégorie :</b> « Utilitaire » pour les modèles 1 à 4, « Authentification » pour le 5.</td><td>Ajouter une phrase commerciale (« profitez de… ») : Meta classerait le modèle en « Marketing ».</td></tr>
    <tr><td>4</td><td><b>Textes :</b> recopier à l’identique, apostrophes ’ et emojis compris. Le plus sûr : <b>copier depuis le fichier texte</b> fourni avec ce guide.</td><td>Retaper le texte à la main, ou le copier depuis le PDF (les emojis et les sauts de ligne se perdent).</td></tr>
    <tr><td>5</td><td><b>Variables :</b> &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;… recopiées telles quelles, <b>avec un exemple pour chacune</b>.</td><td>Oublier un exemple, changer l’ordre des numéros, ou placer une variable tout au début ou à la toute fin du texte.</td></tr>
    <tr><td>6</td><td><b>Un modèle mal rempli ?</b> Cliquez sur « Modifier » et corrigez-le.</td><td><b>Ne le supprimez pas pour le recréer :</b> Meta bloque le même nom pendant environ 30 jours.</td></tr>
  </table>

  <h3 style="margin-top:14px">À quoi ressemble le formulaire de Meta</h3>
  <p style="color:#555;margin-bottom:4px">Schéma simplifié : l’écran réel peut différer légèrement, mais les champs sont les mêmes et dans cet ordre. Les fiches suivantes reprennent ces numéros.</p>
  <div class="screen">
    <div>
      <div class="field"><span class="pin">1</span><b>Nom · Catégorie · Langue</b>bosejour_… · Utilitaire · Français</div>
      <div class="field"><span class="pin">2</span><b>En-tête (facultatif)</b>laisser vide</div>
      <div class="field tall"><span class="pin">3</span><b>Corps du message</b>Le texte, avec les variables &#123;&#123;1&#125;&#125; &#123;&#123;2&#125;&#125;…<br>(bouton « Ajouter une variable »)</div>
      <div class="field"><span class="pin">4</span><b>Exemples des variables</b>un exemple par variable, obligatoire</div>
      <div class="field"><span class="pin">5</span><b>Pied de page (facultatif)</b>courte ligne grise</div>
      <div class="field"><span class="pin">6</span><b>Boutons</b>Appel à l’action → Visiter le site</div>
    </div>
    <div class="side">Aperçu en direct<br>du message<br><br>💬<br><br>vérifiez-le avant d’envoyer</div>
  </div>
  <p class="muted" style="margin-top:6px">Quand tout est rempli : bouton <b>Envoyer</b> <span class="muted">(Submit)</span> en bas de page.</p>
</section>

{models}

<!-- ─── Après l’envoi ─── -->
<section class="page">
  <div class="kicker">Étape 3</div>
  <h2>Après l’envoi : que se passe-t-il ?</h2>
  <p class="lead">Meta examine chaque modèle, en général de quelques minutes à 24 heures. Le statut s’affiche dans la liste des modèles.</p>
  <table class="plain">
    <tr><th style="width:24%">Statut</th><th>Ce que ça veut dire</th><th style="width:34%">Que faire ?</th></tr>
    <tr><td><span class="status s-wait">En cours d’examen</span><small>In review</small></td><td>Meta vérifie le modèle.</td><td>Attendre.</td></tr>
    <tr><td><span class="status s-ok">Approuvé</span><small>Approved</small></td><td>Le modèle est utilisable.</td><td>Rien. Quand les 5 le sont, prévenez-nous.</td></tr>
    <tr><td><span class="status s-no">Refusé</span><small>Rejected</small></td><td>Meta a un reproche : le motif est indiqué.</td><td>Cliquez sur « Modifier », corrigez, renvoyez. Envoyez-nous le motif si besoin.</td></tr>
    <tr><td><span class="status s-pause">En pause / désactivé</span><small>Paused / Disabled</small></td><td>Trop de signalements par les destinataires.</td><td>Nous prévenir.</td></tr>
  </table>

  <h3 style="margin-top:14px">Les erreurs les plus fréquentes</h3>
  <table class="plain err">
    <tr><th style="width:36%">Message ou symptôme <span class="muted">(formulation approximative)</span></th><th style="width:30%">Cause probable</th><th>Solution</th></tr>
    <tr><td>« Exemple manquant » / « Missing sample »</td><td>Une variable n’a pas d’exemple.</td><td>Renseignez un exemple pour <u>chaque</u> variable (voir la fiche).</td></tr>
    <tr><td>« Les variables ne peuvent pas être au début ou à la fin »</td><td>Le texte commence ou finit par &#123;&#123;1&#125;&#125;.</td><td>Recopiez le texte exact, sans retirer la ponctuation ni les mots autour.</td></tr>
    <tr><td>Le modèle 3 est refusé à cause du bouton</td><td>L’exemple d’URL est incomplet.</td><td>Saisissez l’adresse <b>complète</b> : {SITE}/paiement/k3Jd9xQ2LmA7</td></tr>
    <tr><td>Meta a changé la catégorie en « Marketing »</td><td>Le texte ressemble à une promotion.</td><td>Vérifiez que vous avez recopié le texte fourni, sans ajout. Sinon, contestez avec « Demander un examen ».</td></tr>
    <tr><td>« Ce nom existe déjà » / nom impossible à réutiliser</td><td>Un modèle de ce nom a existé (ou a été supprimé il y a moins de 30 jours).</td><td>Modifiez le modèle existant. Si le nom est bloqué, contactez-nous : nous adapterons le nom côté site.</td></tr>
    <tr><td>Le numéro n’est pas accepté</td><td>Il est déjà utilisé sur WhatsApp ou WhatsApp Business.</td><td>Désinscrivez-le d’abord dans l’application, ou choisissez un autre numéro.</td></tr>
  </table>
</section>

<!-- ─── Clé d’accès ─── -->
<section class="page">
  <div class="kicker">Étape 4</div>
  <h2>Numéro et clé d’accès permanente</h2>
  <p class="lead">Le site a besoin d’une clé d’accès qui <b>n’expire pas</b>. Celle que Meta propose par défaut disparaît au bout de 24 heures et ne convient pas.</p>
  <div class="callout warn"><b>Cette étape est la plus technique.</b> Elle demande une « application » Meta rattachée à votre compte WhatsApp. Si aucune application n’apparaît dans la liste, <b>ne cherchez pas plus loin</b> : choisissez l’option A (« Nous donner l’accès »), nous nous en chargeons.</div>

  <h3>Valider le numéro</h3>
  <p>Gestionnaire WhatsApp → <b>Numéros de téléphone</b> → ajoutez votre numéro dédié. Meta envoie un code par SMS ou par appel : saisissez-le pour valider.</p>

  <h3 style="margin-top:10px">Créer la clé permanente</h3>
  <ol class="steps">
    <li><b>Paramètres de l’entreprise → Utilisateurs → Utilisateurs système</b> <span class="muted">(System users)</span> → <b>Ajouter</b>. Rôle : <b>Administrateur</b>.</li>
    <li>Cliquez sur <b>Ajouter des actifs</b> <span class="muted">(Add assets)</span>, choisissez votre <b>compte WhatsApp</b> et donnez le <b>contrôle total</b>.</li>
    <li>Cliquez sur <b>Générer un jeton</b> <span class="muted">(Generate token)</span>. Choisissez l’<b>application</b>, la durée <b>« Jamais »</b> <span class="muted">(Never)</span> et cochez <span class="copy">whatsapp_business_messaging</span> et <span class="copy">whatsapp_business_management</span>.</li>
    <li><b>Copiez le jeton tout de suite</b> : Meta ne l’affiche qu’une seule fois.</li>
  </ol>

  <div class="callout bad"><b>Sécurité :</b> ce jeton permet d’envoyer des messages <b>en votre nom</b>. Ne l’envoyez ni par e-mail, ni par SMS, ni par WhatsApp. Utilisez un gestionnaire de mots de passe partagé, ou donnez-le de vive voix ou par un canal chiffré. Il est ensuite enregistré uniquement dans l’espace administrateur de la plateforme.</div>
</section>

<!-- ─── Ce qu’il faut nous transmettre ─── -->
<section class="page">
  <div class="kicker">Étape 5 · la dernière</div>
  <h2>Ce qu’il faut nous transmettre</h2>
  <table class="plain">
    <tr><th style="width:34%">Élément</th><th>Où le trouver</th></tr>
    <tr><td><b>Identifiant du numéro</b><small>Phone Number ID</small></td><td>Gestionnaire WhatsApp → Numéros de téléphone, juste sous votre numéro.</td></tr>
    <tr><td><b>Identifiant du compte WhatsApp Business</b><small>WhatsApp Business Account ID</small></td><td>Gestionnaire WhatsApp, en haut de la page ou dans les paramètres du compte.</td></tr>
    <tr><td><b>Jeton d’accès permanent</b></td><td>Créé à l’étape précédente. À transmettre avec les précautions de sécurité ci-dessus.</td></tr>
    <tr><td><b>Confirmation « Approuvé » pour les 5 modèles</b></td><td>Gestionnaire WhatsApp → Modèles de messages. Une <b>capture d’écran de la liste</b> suffit.</td></tr>
  </table>
  <div class="callout ok">Si vous avez choisi l’option A, c’est nous qui récupérons ces éléments : il vous reste seulement à valider le numéro et le moyen de paiement.</div>

  <h3 style="margin-top:14px">Votre liste de contrôle</h3>
  <div class="grid2">
    <ul class="chk">
      <li>Compte Meta Business vérifié</li>
      <li>Numéro dédié ajouté et validé par SMS</li>
      <li>Moyen de paiement enregistré</li>
      <li>Modèle 1 · <span class="copy">bosejour_demande_recue</span> approuvé</li>
      <li>Modèle 2 · <span class="copy">bosejour_nouvelle_demande</span> approuvé</li>
    </ul>
    <ul class="chk">
      <li>Modèle 3 · <span class="copy">bosejour_demande_acceptee</span> approuvé</li>
      <li>Modèle 4 · <span class="copy">bosejour_reservation_confirmee</span> approuvé</li>
      <li>Modèle 5 · <span class="copy">bosejour_code_verification</span> approuvé</li>
      <li>Identifiants et jeton transmis en toute sécurité</li>
      <li>Capture d’écran de la liste envoyée</li>
    </ul>
  </div>
  <div class="callout info" style="margin-top:14px"><b>Et ensuite ?</b> Nous enregistrons les identifiants dans l’espace administrateur de BoSéjour, activons l’envoi par modèles, puis testons chaque message avec un numéro de test. Vous serez prévenus dès que tout fonctionne.</div>
</section>

</body></html>'''


def main() -> int:
    logo = base64.b64encode((HERE / 'logo.png').read_bytes()).decode()
    html_path = HERE / 'guide.html'
    html_path.write_text(doc(logo), encoding='utf-8')
    pdf_path = HERE / 'Guide_WhatsApp_BoSejour_Client_v2.pdf'
    subprocess.run(
        [CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
         '--virtual-time-budget=15000', f'--print-to-pdf={pdf_path}', html_path.as_uri()],
        check=True, capture_output=True,
    )
    (HERE / 'Textes_Modeles_WhatsApp_BoSejour.txt').write_text(txt_file(), encoding='utf-8')
    print(f'→ {pdf_path.name}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
