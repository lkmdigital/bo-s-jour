# Plan de refonte — bo séjour

Approche : **faire évoluer l'existant** (Next.js 14 + API Laravel conservée).
Périmètre : **refonte visuelle + nouveau parcours UX** (front prioritaire).

## Identité (charte graphique)
- **Couleurs** : Rouge `#FF0000` (CTA), Noir `#000000`, Blanc (fond), + secondaires : gris-vert `#4B5F5A`, gris foncé `#343434`, beige `#F7E8C6`, rose accent `#EE233C`.
- **Ratio UI** : 60 % blanc / 30 % noir / 10 % rouge.
- **Typos** : Logo = **Baloo 2** · Web/texte = **DM Sans** · Accroches = **Dancing Script** · Slogan = script italique (« Votre séjour commence ici… »). ⚠️ La charte cite « Aeonik » (payante) et « Brush Script MT » : à trancher (Dancing Script proposé en substitut libre).
- **Logo** : « bo » rouge dans rond noir + « séjour » noir + pin rouge. Déclinaisons + icône app dans `design-refonte/identite/`.
- **Boutons** : pilule `rounded-full`, plein rouge (texte blanc) ou contour rouge (texte rouge).

## PHASE 0 — Fondations design system (débloque tout) ✅ FAIT (2026-08-03)
- [x] Tokens Tailwind : `primary` = `#FF0000` + tokens `bosejour` + radius `pill`.
- [x] Polices : Baloo 2 + Dancing Script (next/font), DM Sans conservé.
- [x] Composant `<Logo>` (assets PNG fond clair/sombre + fallback Baloo).
- [x] Librairie `components/ui/` : `Button` (primary/secondary/outline/ghost/danger, tailles, loading, icônes, lien), `Badge` (+ PromoBadge/VerifiedBadge + statuts), `Input` (label/erreur/hint/icônes), `Card`. Helper `cn` dans `lib/utils.ts`.
- [x] Page vitrine / style guide : `/design-system` (référence vivante — à retirer ou protéger avant prod).
- [x] Favicon + icônes PWA « bo » (déclinaison 2 : rond noir + bo rouge), manifest thème #FF0000, titre « bo séjour ».

**PHASE 0 100 % TERMINÉE.**

## PHASE 1 — Parcours Voyageur (public)
- [ ] Home : hero recherche (destination/dates/voyageurs/chambres), promos, destinations CI.
- [ ] Résultats : filtres, tri, carte, badges promo, dispo temps réel.
- [ ] Fiche établissement : galerie, types d'hébergement, politiques d'annulation, mode paiement.
- [ ] Tunnel réservation : récap 1ère nuitée garantie → identification (dont « continuer sans compte ») → **type voyageur Particulier/Corporate** → infos → bandeau sécurité → paiement (Visa/MC/Djamo/Mobile Money).
- [ ] Confirmation + **double canal E-mail/WhatsApp** (côté back : intégration WhatsApp Business à prévoir).
- [ ] Création de compte post-réservation (données préremplies) + profilage progressif.

## PHASE 2 — Extranet Partenaire
- [ ] Landing extranet + inscription light (nom, tél, email, mdp) + double vérif (email + SMS).
- [ ] **Configurateur guidé** avec barre de progression 0 %→100 % + sauvegarde auto.
- [ ] Étapes : infos+WhatsApp établissement → localisation GPS → médias (min 5 photos) → services → politiques (Flexible/Modérée/Stricte) → types d'hébergement (mode pool + avancé) → **tarification dynamique** (saisons, règle acompte ≥ 1 nuitée, import CSV) → mode paiement → calendrier → docs légaux (OCR) → publication (soft launch + séquestre).
- [ ] Modules exploitation : réservations, calendrier, promos, comptabilité, avoirs, litiges, messagerie, stats, utilisateurs/rôles.

## PHASE 3 — Dashboards Admin & Membre
- [ ] Admin : 18 modules (dashboard KPI, établissements, conformité, comptabilité, paiements, avis, promotions, programme membre, inspection, marketing, base touristique, IA, juridique, audit, stratégique).
- [ ] Membre voyageur : dashboard, réservations, favoris, avoirs, programme fidélité (Bronze/Argent/Or/Platine), messagerie, « Mon Voyage », découvrir la CI.

## Chantiers backend à prévoir (hors périmètre front immédiat)
- Intégration **WhatsApp Business API** (double confirmation).
- **Séquestre** des paiements + reversements + commission 10 %.
- **OCR** documents légaux.
- Profils **Corporate** (facturation, collaborateurs, paiement différé).
- Programme de **fidélité** / avoirs.
- **Channel manager** (iCal / API) — optionnel.

## Ordre recommandé
Phase 0 → Phase 1 (le parcours qui génère le CA) → Phase 2 → Phase 3.
