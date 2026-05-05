# Analyse du projet MonBeauPays.com (Bosejour)

Document de référence : **ce qui existe, comment ça fonctionne, et ce qui reste à faire** pour viser une plateforme de niveau type Booking.com.

---

## 1. Stack et architecture

| Couche | Technologie |
|--------|-------------|
| **Backend** | PHP 8.2, Laravel 11, API REST (Sanctum), MySQL/MariaDB |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind, Zustand, Axios |
| **Auth** | Laravel Sanctum (tokens), 2FA (Google2FA), OAuth (Google, Microsoft via Socialite) |
| **Rôles** | user (voyageur), host (hôte), admin + RBAC (rôles/permissions) pour contrôleurs |

- **Backend** : `backend/` — routes dans `routes/api.php`, contrôleurs dans `app/Http/Controllers/`, modèles dans `app/Models/`.
- **Frontend** : `frontend/` — pages dans `app/`, composants dans `components/`, appels API dans `lib/api.ts`, état global (auth, thème, recherche) dans `stores/`.

---

## 2. Ce qui existe et comment ça fonctionne

### 2.1 Authentification

| Fonctionnalité | Comment ça marche |
|----------------|-------------------|
| **Inscription** | `POST /register` — choix rôle (user ou host). Voyageur : CNI/Passeport/Permis + recto/verso. Hôte : infos établissement, type, adresse, WhatsApp. |
| **Connexion** | `POST /login` — email + mot de passe. Si 2FA activé → `POST /login/complete-2fa` avec code. |
| **2FA** | Setup, enable, disable, régénération de codes de secours via `TwoFactorController`. |
| **OAuth** | Google et Microsoft : redirect → callback → création ou liaison de compte. |
| **Rôles / permissions** | User a un `role` (user, host, admin) et des `roles()` RBAC. Routes `check-role`, `check-permission`, `getUserRoles`, `getUserPermissions` pour contrôle d’accès. |

**Côté frontend** : `auth/login`, `auth/register`, `auth/oauth-callback` ; token stocké (localStorage), envoyé en `Authorization: Bearer` ; `authStore` + `userUtils` (isAdmin, isHost, etc.).

---

### 2.2 Hébergements (accommodations)

| Fonctionnalité | Comment ça marche |
|----------------|-------------------|
| **Liste publique** | `GET /accommodations` — filtres : search, city, type, min_price, max_price, featured, check_in, check_out, guests (vérif dispo). Scope `published()` uniquement. |
| **Détail** | `GET /accommodations/{id}` — fiche complète, chambres, images, avis, promotions. |
| **Suggestions / similaire** | `GET /accommodations/suggestions` (autocomplete), `GET /accommodations/{id}/similar` (même ville). |
| **Prix prévisionnel** | `GET /accommodations/{id}/price-preview` — dates + voyageurs → prix (promos, politique annulation). |
| **Création / édition (hôte)** | `POST /accommodations`, upload/suppression/setPrimary médias. Wizard frontend `AccommodationCreationWizard`. |
| **Statuts** | pending → validation admin ; published ; rejected ; removed ; disabled. |
| **Chambres** | `RoomController` : CRUD par établissement, images par chambre (upload, delete, primary). |
| **Disponibilités** | `RoomAvailabilityController` — créneaux par chambre ; prise en compte dans la recherche et la création de réservation. |

**Validation admin** : `AdminAccommodationController` — approve, reject, remove, disable, enable ; notes et audit logs. Gestion des chambres côté admin (CRUD, images, toggle status).

---

### 2.3 Réservations (bookings)

| Étape | Comment ça marche |
|-------|-------------------|
| **Création** | `POST /bookings` (public, throttle 10/min). Vérif dispo (chambre ou hébergement), calcul prix (RoomPricingService, promotions), snapshot politique d’annulation, `expires_at` (ex. 48 h). |
| **Consultation** | `GET /bookings/{id}` — détail (client ou hôte selon ownership). |
| **Paiement** | `POST /bookings/{bookingId}/payment/initiate` puis `POST /payments/{paymentId}/process` (public). Webhook `POST /payments/webhook` pour confirmation. À la confirmation : génération du **code de réservation** (8 caractères), envoi d’un message plateforme au client avec le code. |
| **Confirmation** | Statut booking passe à `confirmed` ; `confirmation_code` stocké. Page frontend `bookings/success` affiche le code et la consigne « remettre au gérant à l’arrivée ». |
| **Check-in** | Hôte saisit le code sur le dashboard → `POST /host/check-in` avec `confirmation_code`. Backend : `booking.checked_in_at` renseigné ; commission associée reçoit `released_at` → le montant entre dans le « solde disponible » de l’hôte. |
| **Annulation** | Mise à jour du statut en `cancelled`. `CancellationPolicyService::onBookingCancelled` : création d’avoir client (ClientCredit) si politique le permet, sinon non remboursable. Pas de flow de remboursement cash (refund) exposé dans les controllers. |

**Frontend** : `bookings/new` (formulaire avec dates, chambre, voyageurs), `bookings/[id]/payment`, `bookings/success`, `bookings/[id]` (détail + affichage du code pour le client). Session de recherche (checkIn, checkOut, guests, etc.) persistée dans `searchStore`.

---

### 2.4 Paiements et revenus

| Élément | Détail |
|--------|--------|
| **Méthodes de paiement** | `GET /payment-methods` (public) — liste des moyens actifs, ordonnés. |
| **Commissions** | Modèle `Commission` ; taux configurable (Setting, ex. 8–10 %). Créées à la confirmation de paiement. |
| **Déblocage hôte** | Uniquement après check-in : `released_at` renseigné sur la commission. Avant = « en attente de check-in », après = « solde disponible ». |
| **Revenus hôte** | `GET /revenue/host` — stats dont `available_balance` (commissions released, status pending) et `awaiting_checkin`. |
| **Demandes de retrait** | Hôte : `GET /host/withdrawal-requests/balance`, `GET /host/withdrawal-requests`, `POST /host/withdrawal-requests`. Admin : `GET /admin/withdrawal-requests`, `POST .../approve`, `POST .../reject`. À l’approbation : commissions marquées payées (FIFO par `released_at`) jusqu’à couvrir le montant. |

**Frontend** : page revenus hôte (solde disponible, en attente check-in, lien « Demandes de retrait »), page `dashboard/host/withdrawals` (formulaire + historique), page admin `dashboard/admin/withdrawals` (liste, approuver/refuser avec note).

---

### 2.5 Avis (reviews)

| Fonctionnalité | Comment ça marche |
|----------------|-------------------|
| **Déposer un avis** | Authentifié : `ReviewController@store`. Ou lien post-séjour : `GET /reviews/booking-by-token/{token}`, `POST /reviews/submit-by-token` (throttle 5/min). |
| **Réponse hôte** | `HostReviewController@reply` — champ `host_reply`, `host_replied_at`. |
| **Affichage** | `GET /accommodations/{id}/reviews` — liste des avis ; type frontend inclut `admin_reply` (réponse établissement) pour affichage sous l’avis. |

Pas de modération (signalement, file d’attente, masquage) ni de notation par critères côté modération.

---

### 2.6 Hôte (dashboard, messagerie, profil)

| Fonctionnalité | Comment ça marche |
|----------------|-------------------|
| **Dashboard** | Stats, hébergements, réservations en attente, alertes. Bloc « Enregistrer une arrivée » (saisie du code réservation) → `HostCheckInCard`. |
| **Réservations** | Liste, détail, demandes en attente (`bookings/requests`). |
| **Revenus / retraits** | Voir § 2.4. |
| **Inbox** | `HostInboxController` — messages reçus (plateforme + voyageurs), réponse, marquer lu. Pas de canal dédié « conversation voyageur ↔ hôte » côté voyageur dans les routes explorées. |
| **Profil** | `HostProfileController` — show, update (POST FormData). |
| **Promotions** | CRUD promotions par hébergement/chambre ; utilisées dans le calcul de prix à la réservation. |

---

### 2.7 Admin

| Zone | Fonctionnalité |
|------|----------------|
| **Utilisateurs** | Liste, création, détail, blocage/déblocage, attribution rôles, journaux d’activité. |
| **Hôtes** | Liste, détail, validate, reject, suspend, removeHostStatus, notes, liste des hébergements. |
| **Établissements** | Liste (filtres status, type, host), création, détail, approve, reject, remove, disable, enable, notes, audit logs ; gestion chambres (CRUD, images, statut). |
| **Inspections** | Création, checklist, start, pause, réponses, complete, approve, reject. |
| **Revenus** | `GET /revenue/admin` — vue globale. |
| **Demandes de retrait** | Liste, approve, reject (avec note admin). |
| **Analytics / dashboard** | Stats globales, activité quotidienne, performance hôtes, répartition statut hébergements. |

---

### 2.8 Recherche et découverte

- **Backend** : `AccommodationController@index` — search (nom, description, city), city, type, min/max price, featured, check_in, check_out, guests (filtre dispo). Suggestions et « similar by city ».
- **Frontend** : `AdvancedSearchBar`, `SearchInputWithAutocomplete`, `searchStore` pour persister la session de recherche.

Pas de carte (map), pas de recherche par rayon ou polygone, pas de filtres avancés (équipements, type de lit, etc.).

---

### 2.9 Divers

- **Paramètres** : `GET /settings/public` (thème, maintenance, etc.) ; settings admin.
- **Promotions** : Modèle et CRUD ; appliquées au calcul de prix à la réservation (`validForPeriod`).
- **Multi-langue** : Fichiers `messages/en.json`, `messages/fr.json` (next-intl) ; intégration peut être partielle.
- **PWA** : manifest, ServiceWorkerRegistration, PWAInstallPrompt ; pas de stratégie offline/cache des assets vérifiée.

---

## 3. Flux résumés

### Parcours voyageur

1. Recherche (dates, lieu, voyageurs) → liste hébergements.
2. Clic sur un hébergement → fiche détail (chambres, prix, avis).
3. Choisir chambre/dates → « Réserver » → formulaire réservation → `POST /bookings`.
4. Redirection paiement → initiate → process → webhook → confirmation.
5. Page succès + détail réservation : **code à présenter au gérant**.
6. Après séjour : lien par token pour laisser un avis.

### Parcours hôte

1. Création hébergement (wizard) → statut pending.
2. Admin approuve → statut published.
3. Réservations reçues → liste dans le dashboard.
4. À l’arrivée du client : saisie du **code réservation** → check-in → déblocage du revenu.
5. Revenus : solde disponible + demandes de retrait ; admin approuve/refuse les retraits.

### Parcours admin

1. Validation des établissements et des hôtes.
2. Inspections (checklists, complétion, approbation).
3. Demandes de retrait : approbation/refus avec note.
4. Utilisateurs, analytics, revenus globaux.

---

## 4. Ce qui reste à faire pour viser une plateforme type Booking

### Recherche et découverte

- Carte (map) avec hébergements et filtres.
- Filtres avancés : équipements, type de lit, services (petit-déj, wifi, etc.), labels.
- Recherche géo (rayon, zone) et suggestions « autour de moi ».
- Tri (prix, note, popularité, distance) et facettes clairs.

### Disponibilités et concurrence

- Disponibilités en temps réel (cache/events) pour limiter surréservation sous forte charge.
- Verrou ou « dernier créé gagne » sur créneaux pendant le tunnel de réservation.

### Paiements et annulations

- Remboursement effectif (refund) côté passerelle + statut `refunded` et mise à jour des commissions/credits.
- Politiques d’annulation affichées clairement (délais, montants) et appliquées de façon cohérente.
- Historique des avoirs (ClientCredit) côté utilisateur.

### Messagerie

- Canal voyageur ↔ hôte : liste des conversations, envoi depuis la fiche réservation ou la fiche détail booking.
- Notifications (email / in-app) pour nouveaux messages.

**Plan d'intégration concret :**

- **Backend**
  - Ajouter un champ optionnel `booking_id` sur le modèle `Message` pour lier une conversation à une réservation.
  - Créer un `UserInboxController` avec :
    - `GET /user/inbox` : conversations où l'utilisateur est émetteur ou destinataire (avec `replies`).
    - `POST /user/inbox` : démarrer une conversation vers l'hôte d'une réservation (via `booking_id`) ou vers la plateforme.
    - `POST /user/inbox/reply` : répondre dans un thread existant (détermination automatique du destinataire).
  - Créer un `BookingMessageController` minimal :
    - `GET /bookings/{id}/messages` : récupérer le fil lié à une réservation (voyageur ou hôte propriétaire).
    - `POST /bookings/{id}/messages` : envoyer un message voyageur → hôte (ou l'inverse via l'admin).
  - Réutiliser `HostInboxController` pour que les hôtes reçoivent ces messages (routage par `recipient_id` et `booking_id`).

- **Frontend**
  - Ajouter une section \"Messages\" sur la page `bookings/[id]` :
    - Affichage du fil de messages pour cette réservation (`GET /bookings/{id}/messages`).
    - Champ de saisie + bouton \"Envoyer un message à l'hôte\" (`POST /bookings/{id}/messages`).
  - Créer une page `dashboard/user/inbox` :
    - Liste de toutes les conversations (plateforme + hôtes) avec aperçu du dernier message.
    - Ouverture d'un fil dans un panneau latéral ou une page dédiée avec possibilité de répondre.
  - Ajouter un badge compteur (non lu) dans le `Header` (icône message) pour les voyageurs et les hôtes.

### Avis et confiance

- Modération : signalement, file d’attente, masquage, validation admin.
- Notation par critères (propreté, rapport qualité-prix, etc.) déjà partiellement en place ; exploiter côté modération et affichage.
- Vérification « séjour effectué » pour afficher un badge.

**Plan d'intégration concret :**

- **Backend**
  - Étendre le modèle `Review` avec :
    - Champs `is_reported` (bool), `report_reason` (texte court), `report_count` (int), `moderation_status` (`pending/approved/hidden`).
  - Ajouter des routes :
    - Voyageur : `POST /reviews/{id}/report` (raison + incrément du compteur, statut `pending`).
    - Admin : `GET /admin/reviews` (filtres : `moderation_status`, hébergement, note), `POST /admin/reviews/{id}/moderate` (actions `approve` ou `hide`).
  - Adapter `ReviewController@index` pour ne retourner que les avis `moderation_status = approved` (sauf pour l’admin).

- **Frontend**
  - Sur la fiche hébergement (`accommodations/[id]`) :
    - Bouton \"Signaler cet avis\" (visiteur connecté) → `POST /reviews/{id}/report` avec message court.
  - Côté admin :
    - Nouvelle page `dashboard/admin/reviews` :
      - Liste paginée des avis signalés (`moderation_status = pending`).
      - Boutons \"Approuver\" (laisse l'avis visible) et \"Masquer\" (le retire de l'affichage public).
      - Affichage des métadonnées : note, texte, auteur, nombre de signalements, hébergement concerné.

### SEO et performance

- Métadonnées dynamiques par page (hébergement, ville, liste).
- Données structurées (JSON-LD) pour les hébergements et les avis.
- Cache API (Redis) et stratégie de cache pour les listes et détails.
- Optimisation images (formats, tailles, lazy load).

### Mobile et PWA

- Vérifier et renforcer le mode offline (pages clés, formulaire réservation en brouillon).
- Notifications push (nouveaux messages, rappels, statut réservation).

**Plan d'intégration concret :**

- **Backend**
  - Préparer une table `push_subscriptions` (user_id, endpoint, keys, user_agent) pour stocker les abonnements Web Push.
  - Ajouter un service d’envoi de notifications Web Push (ex. via `Minishlink/WebPush`) pour les événements clés : nouveau message, changement de statut réservation, rappel review.

- **Frontend**
  - **Service Worker** :
    - Compléter `/sw.js` pour :
      - Mettre en cache les ressources statiques (app shell) et quelques pages clés (home, liste hébergements, détail, bookings).
      - Gérer une stratégie de cache (NetworkFirst ou StaleWhileRevalidate) pour `/accommodations` et `/accommodations/[id]`.
      - Ajouter un gestionnaire `push` pour afficher les notifications (title, body, clic ouvrant la bonne page).
  - **Abonnement aux notifications** :
    - Ajouter un composant `PushSubscriptionManager` (monté dans `layout.tsx` pour les utilisateurs connectés) :
      - Demande de permission `Notification`.
      - Création d’un `PushSubscription` via `serviceWorkerRegistration.pushManager.subscribe(...)`.
      - Envoi de l’abonnement au backend (`POST /notifications/subscribe`).
  - **UX mobile** :
    - Vérifier l’affichage des principaux écrans sur petit écran (header compact, boutons bien espacés, formulaires adaptés).
    - Améliorer la bannière d’installation PWA (`PWAInstallPrompt`) : n’afficher qu’une ou deux fois, avec un bouton \"Plus tard\" qui met un flag dans `localStorage`.

### Expérience utilisateur

- Liste de souhaits (favoris) et comparaison d’hébergements.
- Historique de recherche et recommandations.
- Centre d’aide / FAQ structuré et support (ticketing ou chat).

### Internationalisation et business

- Multi-devises (affichage, conversion, paiement) si cible internationale.
- Tarification dynamique (saison, demande) et options (petit-déj, late check-out) facturables.

### Opérationnel et confiance

- CGU/CGV, politique de confidentialité, mentions légales à jour.
- Processus clair de litiges (annulation, remboursement, litige hôte/voyageur).
- Tableau de bord « qualité » pour les hôtes (notes, annulations, délais de réponse).

---

## 5. Synthèse

- **Déjà en place** : Auth (login, register, 2FA, OAuth), rôles et RBAC, hébergements (CRUD, chambres, images, statuts, validation admin), recherche basique et détail, réservations avec paiement, code réservation et check-in, commissions et déblocage après check-in, demandes de retrait (hôte + admin), avis et réponse hôte/établissement, promotions, inbox hôte, inspections admin, analytics, PWA de base.
- **À renforcer pour viser un niveau Booking** : recherche avancée et carte, disponibilités et concurrence, remboursements et politique d’annulation claire, messagerie voyageur–hôte, modération des avis, SEO et performance, mobile/PWA et notifications, favoris/comparaison/support, multi-devises et options tarifaires, cadre juridique et litiges.

Ce document reflète l’état du projet tel qu’analysé dans le code (backend + frontend). Les écarts listés en §4 sont des pistes de travail par rapport à une cible « type Booking », pas une liste de bugs.
