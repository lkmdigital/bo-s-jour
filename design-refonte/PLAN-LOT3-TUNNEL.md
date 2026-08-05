# Plan d'action — Lot 3 : Tunnel de réservation & confirmation

Le plus lourd (front + back + API externes). Approche : front d'abord quand possible, mais 3.4/3.5 sont majoritairement backend.

Légende : ✏️ modifier · ➕ créer · ⚙️ back · 🔑 nécessite une clé/API externe (réglable par l'admin)

## État de l'existant (utile)
- `bookings.user_id` **nullable** → réservation invité possible en base.
- Modèle **`ClientCredit`** (avoirs) déjà présent. E-mails (BookingConfirmation, PaymentConfirmation, HostNewBooking) présents.
- `booking_type` = standard/group (pas encore `corporate`). Formulaire actuel `EnhancedBookingForm` basique.
- **Aucun service WhatsApp.** `SmsService` présent.

---

## 3.1 — Tunnel `bookings/new` refondu (design charte) [item 5] ✅ FAIT (2026-08-04)
Composant `components/booking/BookingWizard.tsx` (wizard 5 étapes) branché dans `app/bookings/new/page.tsx` :
Récap (1ère nuitée garantie) → Compte (**Continuer sans compte** / Se connecter, sauté si connecté) → **Particulier/Corporate** → Coordonnées (+ bloc entreprise + option paiement différé) → Vérification (**bandeau sécurité remboursement 24h** + CGV) → POST `/bookings` → paiement.
Récap sticky (price-preview : total + **En ligne 1ère nuitée / solde**). Vérifié en live (invité).
⚠️ Les champs `traveler_type`/`company_*`/`residence_*` sont envoyés mais **persistés seulement après 3.2/3.3** (back). La résa invité particulier fonctionne déjà (name/email/phone acceptés par le back).

### (détail initial)
Parcours en étapes (le cœur visible) :
1. **Récap** : établissement, dates, nuits, taxes, total, **montant en ligne (1ère nuitée) / solde sur place**, message **« 1ère nuitée garantie »**, politique d'annulation.
2. **Identification** : « Se connecter » OU **« Continuer sans compte »** (mis en avant).
3. **Type de voyageur** : **Particulier / Corporate** (si Corporate → champs entreprise).
4. **Infos voyageur** : nom, prénoms, tél, e-mail, **confirmation WhatsApp** ; + pays/ville (stats).
5. **Vérification** : récap complet + CGV (case) + **bandeau sécurité** « remboursement auto 24h si refus ».
6. → **Paiement** (`bookings/[id]/payment`, déjà là) au design charte.
- ✏️ `app/bookings/new/page.tsx` + refonte `EnhancedBookingForm` (ou nouveau `BookingWizard`).

## 3.2 — Réservation invité (sans compte) [item 1] ⚙️ ✅ FAIT (2026-08-04)
- Le flux invité **auto-crée** un compte (email → user) marqué **`is_guest=true`** → réservations rattachées par e-mail.
- Migration : `users.is_guest` + colonnes booking (résidence). `store` persiste résidence/nationalité.
- **Activation post-résa** : endpoint léger `POST /auth/activate-guest` (email + mot de passe) → définit le mot de passe, `is_guest=false`, renvoie un token. Les réservations suivent automatiquement. Vérifié (HTTP 200).
- Reste (front, léger) : page « Créer mon espace » post-réservation qui appelle `/auth/activate-guest` (données préremplies) + relances H+2/24/72 (emails, planif).

## 3.3 — Profil Corporate (entreprise) [item 2] ⚙️ ✅ FAIT (2026-08-04)
- Colonnes booking : `traveler_type` (individual/corporate), `company_name`, `company_vat`, `company_address`, `company_billing_email`, `deferred_payment`.
- `store` valide (`required_if:traveler_type,corporate`) et persiste. **Paiement différé** Corporate → booking validé sur facture, **`expires_at=NULL`** (pas d'expiration 48h). Vérifié bout-en-bout.
- Reste : facture PDF pro + espace « Mon entreprise » (collaborateurs, rapports) → Phase 3 dashboards.

### (détails ci-dessous)

## 3.2b — Réservation invité (sans compte) [item 1] ⚙️
- ⚙️ Ajouter colonnes `guest_name`, `guest_email`, `guest_phone`, `guest_whatsapp` sur `bookings` (si absentes).
- ⚙️ `BookingController@store` : accepter une résa **sans token** avec contact invité (validation).
- ⚙️ **Rattachement a posteriori** : à la création de compte (même e-mail/tél), rattacher les bookings invités (`user_id`).
- ✏️ Front : flux « Continuer sans compte » + relances création de compte (H+2/24/72) — pages d'activation préremplies.

## 3.3 — Profil Corporate (entreprise) [item 2] ⚙️
- ⚙️ Stockage entreprise : table `company_profiles` (ou colonnes) — raison sociale, TVA/contribuable, adresse, e-mail facturation, service/projet.
- ⚙️ `booking_type='corporate'` + **facturation pro** + **paiement différé** (« Paiement par mon entreprise » → booking validé sur facture, sans paiement immédiat).
- ✏️ Front : bloc Corporate dans le tunnel + rappel infos entreprise préremplies.

## 3.4 — Double confirmation E-mail + WhatsApp [item 3] ⚙️🔑 ✅ FAIT (2026-08-04)
- `App\Services\WhatsAppService` (Meta Cloud API) : `sendText` + `sendBookingConfirmation`, **no-op propre** si non configuré (aucune erreur bloquante).
- Branché dans `BookingService::confirm()` → **WhatsApp en plus de l'e-mail** (+ SMS + notif in-app) à la confirmation.
- Réglages admin `whatsapp_enabled` / `whatsapp_token` / `whatsapp_phone_id` (SettingsController + page réglages). **Sensibles → JAMAIS dans `/settings/public`** (vérifié).
- 🔑 En attente du client : compte **WhatsApp Business (Meta)** + **templates approuvés** (le `sendText` ne marche que dans la fenêtre 24h ; en prod il faut un template). Toggle OFF par défaut.
- Aussi fait : page front **`/auth/activate`** + CTA « Créer mon espace » sur la page succès → clôture 3.2. Vérifié bout-en-bout (activation → connecté).

### (détail ci-dessous)
- 🔑 Réglages admin : **WhatsApp Business API** (token, phone_number_id) — comme la carte (section Intégrations).
- ➕ `WhatsAppService` (Meta Cloud API) : vérification du numéro (code) + envoi du message de confirmation (code résa, dates, lien).
- ⚙️ Brancher l'envoi **WhatsApp en plus de l'e-mail** à la confirmation (auto & sur demande).

## 3.5 — Remboursement auto, No Show & avoirs [item 4] ⚙️🔑 ✅ FAIT (2026-08-04)
- **Refus établissement** ("sur demande") : `BookingService::refuse()` + endpoint `POST /bookings/{id}/refuse` (host/admin) → **remboursement intégral** (marqué immédiatement = « sous 24h »), `payment_status=refunded`, **pas d'avoir**. Vérifié (#11 refund=25000).
- **No Show** : commande planifiée `bookings:detect-no-show` (quotidien 11h, Kernel) → marque `no_show_at`, **l'établissement conserve l'acompte** (refund=0, credit=0). Vérifié (#1).
- **Avoirs voyageur** : l'annulation par le voyageur génère toujours un `ClientCredit` via `CancellationPolicyService::onBookingCancelled` (existant, inchangé, dédoublonné).
- Migration : `no_show_at`, `refund_amount`, `credit_amount`, `refunded_at`.
- 🔑 En attente client : **passerelle de paiement** avec remboursement (le versement effectif est un hook `TODO` ; la logique/marquage est en place).

## ✅ LOT 3 TERMINÉ (3.1 tunnel + 3.2 invité + 3.3 corporate + 3.4 WhatsApp + 3.5 remboursement/No Show/avoirs).

### (détail ci-dessous)
- ⚙️ Paiements **séquestrés** jusqu'à validation (déjà partiellement : statut pending/paid).
- ⚙️ Mode « sur demande » : refus établissement → **remboursement auto ≤ 24h** (via gateway 🔑).
- ⚙️ **No Show** : job planifié (Laravel scheduler) → détecte absence de check-in → applique politique (conserve l'acompte).
- ⚙️ Annulation → application politique (Flexible/Modérée/Stricte) → génère **avoir** (`ClientCredit`).

---

## Dépendances externes (à fournir par le client, réglables par l'admin)
- 🔑 **WhatsApp Business API** (Meta) : token + phone_number_id + templates approuvés.
- 🔑 **Passerelle de paiement** avec remboursement (CinetPay / PayDunya / Stripe…) pour le remboursement auto.

## Ordre recommandé
3.1 tunnel front (valide le parcours, très visible) → 3.2 invité → 3.3 corporate → 3.4 WhatsApp → 3.5 remboursement/No Show/avoirs.
