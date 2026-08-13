# Plan d'attaque — Phase 2 : Extranet Partenaire

Objectif : donner à l'hôte un parcours complet et honnête, de l'inscription à l'exploitation quotidienne, en s'appuyant sur ce qui existe déjà (beaucoup de modules d'exploitation sont réels et branchés) plutôt que de tout reconstruire.
Principe : **le client veut publier vite**. On sépare donc explicitement ce qui bloque un lancement opérationnel de ce qui peut suivre en itération. Chaque LOT indique son statut réel (audit du 2026-08-12) avant tout travail.

Légende : ✏️ modifier · ➕ créer · ⚙️ dépend du backend · ✅ fait · 🟡 partiel · ❌ à faire

---

## Constat de départ (audit brief vs code)

Contrairement à la Phase 1 (Voyageur) qui partait quasiment de zéro sur le tunnel, l'Extranet a déjà une bonne partie des **modules d'exploitation** réels et branchés : chambres, tarification saisonnière, calendrier, promotions (partielles), finances/retraits, statistiques/analytics, commission. Le vrai trou est en **amont** (inscription, onboarding, configuration de l'établissement) et sur des **fonctions transverses** (collaborateurs, documents légaux, publication contrôlée).

---

## LOT 1 — Inscription & connexion partenaire (brief Phases 3-4)
**Statut : ✅ fait (2026-08-13).** `registerPartnerLight()` (nom, prénoms, tél, e-mail, mdp) + OTP e-mail (décision produit : pas de SMS, cf. ci-dessous) + `register-partenaire/page.tsx` réécrit sur un seul écran. Vérifié en direct (inscription → e-mail réel reçu → vérification → connexion role=host).

- `frontend/app/auth/register-partenaire/page.tsx` (892 l.) collecte déjà nom établissement, type, adresse, WhatsApp **dès l'inscription** — le brief demande une inscription *light* (nom, tél, email, mdp uniquement), le reste étant repoussé au dépôt des documents légaux.
- ❌ **Aucune vérification de compte hôte** : `AuthController::register()` délivre le token immédiatement (contrairement à `registerTraveler()` qui bloque tant que l'OTP e-mail n'est pas validé). Le brief demande double vérif e-mail (lien magique) + SMS.
- Connexion (`/auth/login`) : réutilise déjà le flux commun (2FA, OTP) — rien à faire de spécifique ici, **✅ OK tel quel**.

### À faire
- [ ] ⚙️➕ Alléger `register()` côté hôte (ou créer un `registerPartnerLight()` dédié, sur le modèle de `registerTraveler()`) : nom, prénoms, téléphone, e-mail, mot de passe. Établissement/type/adresse repoussés au LOT 3.
- [ ] ⚙️ Brancher la vérification e-mail existante (`sendEmailOtp`/`verifyEmailOtp`) sur ce flux, comme pour le voyageur.
- [ ] ⚙️ Vérification téléphone par SMS : `SmsService` existe déjà (utilisé pour l'OTP voyageur) — le réutiliser plutôt que d'ajouter un « lien magique » e-mail séparé (redondant avec l'OTP e-mail, plus simple à maintenir avec un seul canal éprouvé).
- [ ] ✏️ Adapter `register-partenaire/page.tsx` : ne garder que les 5 champs light + les 2 écrans de vérification (email puis SMS), sur le modèle de `verify-otp/page.tsx` (voyageur).

**Décision produit (2026-08-13)** : OTP e-mail seul, pas de SMS — pour limiter la friction à l'inscription. `SmsService` reste réutilisable plus tard si besoin.

---

## LOT 2 — Landing Extranet & configurateur guidé (brief Phase 2 + 4)
**Statut : ✅ fait (2026-08-13).** Landing `/partenaire` + lien header (n'existait nulle part) + écran "Prise en main" (mode guidé → assistant existant, mode expert → dashboard direct). Le wizard guidé lui-même réutilise l'assistant de création déjà existant plutôt qu'une reconstruction dédiée.

Aujourd'hui un hôte connecté tombe directement sur `frontend/app/dashboard/host/page.tsx`, avec tous les menus déjà visibles et indépendants. Pas de landing dédiée « pourquoi rejoindre BoSéjour », pas d'assistant pas-à-pas, pas de choix guidé/expert.

### À faire
- [ ] ➕ Landing `/partenaire` (ou `/extranet`) : proposition de valeur (visibilité, double confirmation, paiement en ligne, politiques d'annulation, promotions, accompagnement), CTA **Créer mon établissement** / **Se connecter**. Rapide à faire, fort impact commercial — bon candidat pour lancement.
- [ ] ➕ Écran « Prise en main » post-connexion (si établissement à 0% de complétion) : barre 0%→100% (la barre existe déjà côté `HostProfileController`, juste pas mise en avant comme point d'entrée), bouton **Commencer la configuration**, choix **Mode guidé** (redirige vers un wizard pas-à-pas) / **Mode expert** (accès direct aux menus actuels — donc rien à changer pour ceux qui préfèrent l'existant).
- [ ] ➕⚙️ Wizard guidé lui-même : réutilise les écrans/API déjà existants (property, rooms, calendar…) mais les enchaîne dans l'ordre du brief avec sauvegarde auto (déjà le comportement naturel des formulaires actuels — juste besoin d'un fil conducteur visuel).

**Ce LOT est un habillage/orchestration de l'existant plus qu'une reconstruction — bon rapport effort/impact perçu par le client.**

---

## LOT 3 — Fiche établissement complète (brief Phases 5-6)
**Statut : 🟡 le plus gros trou "silencieux" — des champs existent en base mais sont invisibles côté hôte.**

Déjà réel : nom, type, description, équipements, GPS auto (`accommodations/[id]/edit/page.tsx`).
Champs qui existent dans `Accommodation` (`star_rating`, `check_in_time`, `check_out_time`, `cancellation_policy_hours`) mais **absents du formulaire hôte** → le voyageur voit toujours les valeurs par défaut, l'hôte ne peut rien changer. C'est le trou le plus gênant pour un lancement crédible.

### À faire (priorité haute — impacte directement ce que voit le voyageur)
- [ ] ✏️ Ajouter au formulaire `edit/page.tsx` (+ `new/page.tsx`) : catégorie (étoiles 1-5), horaires check-in/check-out.
- [ ] ✏️⚙️ **Politique d'annulation en 3 choix (Flexible/Modérée/Stricte)** au lieu du champ heures brut — mapper vers `cancellation_policy_hours` (48/24/0) en interne pour ne pas casser l'existant côté voyageur/paiement.
- [ ] ➕⚙️ Champ **WhatsApp officiel de l'établissement**, distinct du téléphone personnel de l'hôte (nouveau champ sur `Accommodation`, utilisé plus tard par l'API WhatsApp pour les confirmations liées à cet établissement plutôt qu'à l'hôte).
- [ ] ➕⚙️ Règle bloquante **minimum 5 photos** avant de pouvoir publier (à coupler avec le LOT 6 — checklist de publication).

### Priorité basse (peut suivre)
- [ ] ➕⚙️ Langues parlées, CGV personnalisables (`special_conditions` existe déjà en base, juste pas exposé).

---

## LOT 4 — Hébergements & tarification (brief Phase 7)
**Statut : ✅ largement fait, gaps ciblés.**

Room types, capacité, équipements, quantité, tarification saisonnière (prix fixe par période) : déjà réels et branchés (`rooms/new`, `RoomPricePeriodController`).

### Règle d'airain (acompte ≥ 1 nuitée) — ✅ décision prise (2026-08-13), pas de code à écrire
En creusant l'implémentation réelle : `deposit_amount`/`deposit_required` sur `Accommodation` sont des champs **morts**, jamais lus par le calcul de paiement. La vraie règle vit dans `PaymentOptionsService::computeOptions()` : `garantie = max(1ère nuitée, commission)`, appliquée **globalement, non contournable, identique pour tous les établissements**. C'est déjà plus sûr que ce que demande le brief (un hôte ne peut pas configurer un acompte insuffisant puisqu'il n'y a rien à configurer).
Rendre le mode d'acompte réellement configurable par hôte (% ou montant fixe) demanderait de réécrire ce service central, utilisé par **toutes** les réservations (tarif intégral, séjours longs, etc.) — trop risqué juste avant un lancement rapide.
**Décision : on laisse tel quel.** `deposit_amount`/`deposit_required` restent des champs inertes (à nettoyer plus tard si besoin) ; la sécurité du voyageur n'est pas affectée.

### À faire
- [ ] 🟡 Ajouter % de majoration/réduction et séjour minimum aux périodes tarifaires (`RoomPricePeriod` n'a que le prix brut aujourd'hui).
- [ ] ❌ Import CSV grille tarifaire — confort, pas bloquant pour un lancement avec peu d'établissements.
- [ ] ❌ Mode avancé (numéros de chambre physiques) — à ne faire que si un partenaire hôtel de charme le demande explicitement ; sinon coût pour peu d'usage au lancement.

---

## LOT 5 — Calendrier & disponibilités (brief Phase 8)
**Statut : ✅ fait.** Ouverture/fermeture/blocage par chambre, branché en temps réel (`rooms/[roomId]/calendar`). Seul point cosmétique : l'URL `/dashboard/host/calendar` n'est qu'une redirection vers `/bookings` — à corriger si un hôte cherche le calendrier depuis le menu (petite confusion UX, pas fonctionnel).

### À faire
- [ ] ✏️ Faire pointer le lien menu "Calendrier" vers le bon écran (ou ajouter un hub calendrier multi-chambres si plusieurs types d'hébergement).

---

## LOT 6 — Documents légaux & publication contrôlée (brief Phases 10-11-12)
**Statut : ✅ RIB + checklist de publication faits (2026-08-13). OCR/statut par document/séquestre restent hors périmètre (voir ci-dessous).**

Déjà réel : upload pièce d'identité, RCCM, IFU/fiscal (`User` model). Commission 10% déjà complète et fonctionnelle.

Manque, dans l'ordre d'impact :
1. ❌ **Coordonnées bancaires (RIB)** — aucun champ dédié aujourd'hui, seulement du texte libre sur la demande de retrait. **À faire avant de reverser du vrai argent à des partenaires.**
2. ❌ **Checklist de publication** — aujourd'hui `status` est basculé manuellement par un admin, sans vérification automatique (5 photos, prix défini, politique définie, docs déposés). Un admin humain qui vérifie à la main peut suffire pour les premiers établissements, mais ne tiendra pas à l'échelle.
3. ❌ Statut par document (en attente/validé/à corriger/refusé) — aujourd'hui un seul statut global `profile_verified`.
4. ❌ OCR automatique — clairement post-lancement, un contrôle humain fait le travail au démarrage.
5. ❌ Séquestre des paiements pendant validation — dépend du modèle métier réel (est-ce que Malia Pay permet un blocage de fonds ?) : **à cadrer avec le client/la passerelle**, pas juste un développement front/back.

### Fait (2026-08-13)
- [x] ➕⚙️ Champ RIB (banque, titulaire, n° de compte/IBAN) sur le profil hôte (`Finances > Demandes de retrait`), requis avant toute demande de retrait (bloqué côté serveur).
- [x] ✏️⚙️ Bouton **"Publier mon établissement"** côté hôte : checklist réelle (5 photos, prix, politique d'annulation, WhatsApp établissement, RIB), revalidée côté serveur, marque `submitted_for_review_at` (le statut reste `pending`, seul un admin publie — garde-fou existant conservé). Pas de notification admin automatique pour l'instant (l'admin voit déjà tous les `pending` dans son écran de revue existant) ; pourrait trier/filtrer sur ce nouveau champ plus tard si le volume le justifie.

### Peut attendre
- [ ] Statut par document, OCR, séquestre — à planifier une fois le volume de partenaires le justifie.

---

## LOT 7 — Collaborateurs & rôles hôte (brief Phase 13)
**Statut : ❌ placeholder "Bientôt" explicite, zéro backend.**

`frontend/app/dashboard/host/staff/page.tsx` est un `<ComingSoon>` sans aucun appel API.

### Recommandation
**Ne pas construire pour le lancement.** La majorité des premiers établissements partenaires seront probablement gérés par une seule personne (le propriétaire). Un système de rôles (Administrateur/Réceptionniste/Comptabilité/Commercial/Housekeeping/Maintenance) est un chantier consistant (permissions scoped par établissement) pour un besoin qui ne se manifestera qu'une fois la base de partenaires plus mature — même schéma que pour les collaborateurs Corporate côté voyageur (fait récemment, patron réutilisable le moment venu).

---

## LOT 8 — Réservations, mode de confirmation, litiges (brief Phase 14)
**Statut : 🟡 le cœur (confirmation auto + double canal) fonctionne déjà ; ce qui manque est optionnel.**

Aujourd'hui : confirmation **toujours automatique** après paiement (`BookingService::confirm()`), pas de bascule "sur demande" configurable, mais `refuse()` existe déjà pour qu'un hôte annule/refuse une réservation a posteriori (avec remboursement automatique côté voyageur, déjà vérifié).

### À faire (si le client y tient vraiment)
- [ ] ➕⚙️ Champ `confirmation_mode` (auto/sur_demande) par établissement + écran "Nouvelles demandes" pour accepter/refuser avant paiement.
- [ ] ❌ Gestion de litiges dédiée — aucune UI ni modèle. À ne construire que si des litiges réels remontent (mieux vaut apprendre du premier cas concret que d'anticiper une structure).

**Recommandation : lancer avec confirmation automatique uniquement (déjà robuste), ajouter "sur demande" plus tard si des partenaires le demandent explicitement.**

---

## LOT 9 — Exploitation quotidienne (brief Phase 15)
**Statut : ✅ la partie la plus solide du parcours partenaire.**

Finances/retraits, statistiques, analytics : tous branchés sur des données réelles (`/revenue/host`, `/analytics/host`, `/host/withdrawal-requests`). Promotions fonctionnelles (% réduction, ciblage chambre, période) mais incomplètes vs brief (pas de montant fixe, pas de "nuit offerte", pas de code promo, pas de suivi de performance).

### À faire (amélioration incrémentale, pas bloquant)
- [ ] ✏️⚙️ Promotions : ajouter réduction en montant fixe, "une nuit offerte", séjour minimum, code promo personnalisé.
- [ ] ➕⚙️ Relances anti-abandon hôte (H+24/H+72/H+168) sur le modèle de `RemindGuestActivation` déjà en place côté voyageur — même patron de code, à dupliquer/adapter pour les inscriptions hôte incomplètes.

---

## LOT 10 — Synchronisation externe / Channel Manager (brief Phase 9)
**Statut : ❌ n'existe pas — explicitement optionnel dans le brief lui-même.**

Aucune action recommandée avant lancement. À ne considérer que si des partenaires utilisant déjà Booking.com/Airbnb le demandent comme condition d'adhésion.

---

## Ordre recommandé pour un lancement rapide

**Vague 1 — bloquant pour un lancement crédible : ✅ TERMINÉE (2026-08-13)**
LOT 3 ✅ (politique d'annulation/horaires/WhatsApp établissement) → LOT 4 ✅ (règle d'airain : déjà sûre, décision de ne pas la rendre configurable) → LOT 6 ✅ (RIB + bouton de publication contrôlée).

**Vague 2 — améliore fortement l'expérience d'onboarding : ✅ TERMINÉE (2026-08-13)**
LOT 1 ✅ (inscription light + vérification) → LOT 2 ✅ (landing + configurateur guidé).

**Vague 3 — peut suivre après les premiers partenaires réels :**
LOT 5 (correction lien calendrier, cosmétique) → LOT 9 (promotions avancées, relances anti-abandon) → LOT 8 (mode sur-demande, si demandé).

**Non prioritaire / à ne construire que sur demande explicite d'un partenaire :**
LOT 7 (collaborateurs/rôles) → LOT 10 (channel manager) → OCR/séquestre/statut par document (fin du LOT 6).

---

## Chantiers backend transverses à garder en tête
1. Champ RIB + validation avant premier retrait (LOT 6).
2. Montant numérique associé à `deposit_amount` + validation "≥ 1 nuitée" (LOT 4).
3. Nouveau champ `whatsapp` sur `Accommodation` (LOT 3), distinct du WhatsApp personnel de l'hôte.
4. Décision produit sur la vérification SMS hôte (LOT 1) — à trancher avant de coder pour éviter un aller-retour.
