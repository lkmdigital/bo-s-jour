# 📊 Analyse : Dashboard Hôte existant vs Structure cible

**Date** : 2026-01-22  
**Objectif** : Comparer le dashboard hôte actuel avec la structure cible du document fonctionnel  
**Règle** : Pas de redesign, pas de refactor global

---

## Structure de comparaison

Pour chaque section de la structure cible :
- ✅ **Existe déjà** : Page/route/API fonctionnelle
- ⚠️ **Partielle** : Existe mais incomplète ou données non exposées
- ❌ **Absente** : N'existe pas

---

## 1. ACCUEIL

### Structure cible
- Réservations du jour
- Arrivées / départs
- Chambres disponibles
- Alertes importantes

### Implémentation actuelle

**Page** : `/dashboard/host/page.tsx` (page principale)

**Données disponibles** (via `/analytics/host`) :
- `pending_bookings` : ✅ Réservations en attente
- `upcoming_bookings` : ✅ Réservations à venir (30 jours)
- `room_stats` : ✅ Statistiques chambres (total, actives, inactives)
- `accommodations.pending` : ✅ Hébergements en attente

**Affichage actuel** :
- ✅ Alertes réservations en attente (lignes 317-332)
- ✅ Alertes hébergements en attente (lignes 334-341)
- ✅ Statistiques chambres (lignes 343-348) via `RoomStatsCard`
- ✅ Liste des hébergements avec statistiques

### ⚠️ Statut : PARTIELLEMENT GÉRÉ

**Ce qui manque** :
- ⚠️ **Réservations du jour** : Pas de compteur spécifique "réservations du jour" (seulement `upcoming_bookings` sur 30 jours)
- ⚠️ **Arrivées / départs** : Pas de section dédiée "Arrivées aujourd'hui" / "Départs aujourd'hui"
- ⚠️ **Chambres disponibles** : Statistiques présentes mais pas de compteur "chambres disponibles aujourd'hui"

**Données déjà disponibles mais non exposées** :
- `daily_bookings` dans `accommodations_stats` (réservations du jour par établissement)
- `daily_revenue` dans `accommodations_stats` (revenus du jour)
- Données de `BookingController::hostReservations()` (week, month, two_months, history)

### 🔧 Ajouts minimaux nécessaires
- Ajouter section "Réservations du jour" : Compteur depuis `daily_bookings` ou calcul depuis `hostReservations()`
- Ajouter section "Arrivées / Départs" : Filtrer `upcoming_bookings` par date = aujourd'hui
- Ajouter compteur "Chambres disponibles aujourd'hui" : Calcul depuis `room_stats` et réservations du jour

---

## 2. TARIFS & DISPONIBILITÉS

### Structure cible
- Calendrier par type de chambre
- Prix de base
- Supplément personne
- Blocage dates

### Implémentation actuelle

**Routes API** :
- `GET /accommodations/{accommodationId}/rooms/{roomId}/calendar` : ✅ Calendrier par chambre
- `GET /accommodations/{accommodationId}/rooms/{roomId}/availability` : ✅ Disponibilités
- `POST /accommodations/{accommodationId}/rooms/{roomId}/availability` : ✅ Créer disponibilité
- `POST /accommodations/{accommodationId}/rooms/{roomId}/availability/bulk` : ✅ Mise à jour en masse
- `PUT /accommodations/{accommodationId}/rooms/{roomId}/availability/{id}` : ✅ Modifier
- `DELETE /accommodations/{accommodationId}/rooms/{roomId}/availability/{id}` : ✅ Supprimer

**Contrôleur** : `RoomAvailabilityController` ✅

**Données disponibles** :
- `price_per_night` : ✅ Prix de base (dans `rooms`)
- `price_override` : ✅ Prix personnalisé par date (dans `room_availabilities`)
- `status` : ✅ Statut (available, occupied, maintenance) pour blocage dates
- `single_occupancy_price` : ✅ Prix occupation simple
- `extra_bed_price` : ✅ Supplément lit d'appoint

**Pages frontend** :
- ❌ Pas de page dédiée "Tarifs & disponibilités"
- ⚠️ Gestion disponible via page de gestion des chambres (`/dashboard/host/accommodations/{id}/rooms`)

### ⚠️ Statut : PARTIELLEMENT GÉRÉ

**Ce qui manque** :
- ❌ **Page dédiée "Tarifs & disponibilités"** : Pas de page centralisée
- ⚠️ **Calendrier par type de chambre** : API existe mais pas d'interface frontend dédiée
- ⚠️ **Supplément personne** : `extra_bed_price` existe mais pas de champ "supplément personne" (différent de lit d'appoint)

**Données déjà disponibles mais non exposées** :
- Toutes les données API sont disponibles mais pas d'interface frontend dédiée

### 🔧 Ajouts minimaux nécessaires
- Créer page `/dashboard/host/tarifs-disponibilites` ou `/dashboard/host/accommodations/{id}/pricing`
- Intégrer composant calendrier utilisant `RoomAvailabilityController::getCalendar()`
- Afficher prix de base et suppléments depuis `rooms.price_per_night`, `single_occupancy_price`, `extra_bed_price`
- Permettre blocage dates via `status = 'occupied'` ou `'maintenance'`

---

## 3. RÉSERVATIONS

### Structure cible
- À venir
- En cours
- Passées
- Annulées
- Actions simples :
  - Confirmer
  - Annuler selon règles
  - Contacter client

### Implémentation actuelle

**Pages** :
- `/dashboard/host/bookings/page.tsx` : ✅ Vue calendrier et liste par période
- `/dashboard/host/bookings/requests/page.tsx` : ✅ Demandes de réservation (pending)
- `/dashboard/host/bookings/[id]/page.tsx` : ✅ Détails d'une réservation

**Routes API** :
- `GET /bookings` : ✅ Liste avec filtres (status, payment_status, period, search)
- `GET /bookings/host/overview` : ✅ Vue d'ensemble (week, month, two_months, history)
- `PUT /bookings/{id}` : ✅ Modifier statut (confirm/cancel)
- `GET /bookings/{id}` : ✅ Détails

**Données disponibles** :
- Filtres par statut : ✅ pending, confirmed, cancelled
- Filtres par période : ✅ upcoming, past, all
- Actions : ✅ Confirmer, Annuler (avec raison)
- Informations client : ✅ Nom, email, téléphone

**Affichage actuel** :
- ✅ Vue calendrier mensuel (lignes 281-316)
- ✅ Vue liste par période (lignes 318-324) : Cette semaine, Ce mois-ci, Deux prochains mois, Historique
- ✅ Actions : Confirmer, Refuser (lignes 469-487 dans requests/page.tsx)
- ✅ Informations paiement : Acompte, Reste à payer, Statut (lignes 420-455)

### ✅ Statut : COMPLÈTEMENT GÉRÉ
- Toutes les fonctionnalités demandées sont présentes
- Actions simples disponibles
- Filtres par statut et période fonctionnels

### 🔧 Ajouts minimaux (optionnel)
- Ajouter bouton "Contacter client" (email/téléphone) si non présent dans page détails

---

## 4. ÉTABLISSEMENT

### Structure cible
- Infos générales
- Types de chambres
- Capacités
- Équipements (cochables)
- Photos
- Structure verrouillée après validation DG

### Implémentation actuelle

**Pages** :
- `/dashboard/host/accommodations/[id]/edit/page.tsx` : ✅ Modification établissement
- `/dashboard/host/accommodations/[id]/rooms/page.tsx` : ✅ Gestion chambres
- `/dashboard/host/accommodations/[id]/rooms/new/page.tsx` : ✅ Ajouter chambre
- `/dashboard/host/accommodations/[id]/rooms/[roomId]/edit/page.tsx` : ✅ Modifier chambre
- `/dashboard/host/accommodations/[id]/rooms/[roomId]/images/page.tsx` : ✅ Gérer images chambres

**Routes API** :
- `GET /accommodations/my` : ✅ Liste établissements hôte
- `GET /accommodations/{id}` : ✅ Détails établissement
- `PUT /accommodations/{id}` : ✅ Modifier établissement
- `GET /accommodations/{id}/rooms` : ✅ Liste chambres
- `POST /accommodations/{id}/media` : ✅ Upload images établissement
- `DELETE /accommodations/{id}/media/{imageId}` : ✅ Supprimer image

**Données disponibles** :
- Infos générales : ✅ Tous les champs (nom, type, description, localisation, etc.)
- Types de chambres : ✅ Via `/accommodations/{id}/rooms`
- Capacités : ✅ `max_guests`, `bedrooms`, `bathrooms` + capacités par chambre
- Équipements : ✅ `amenities` (JSON), services (shuttle, laundry, etc.)
- Photos : ✅ Table `accommodation_images` avec gestion complète

**Verrouillage après validation** :
- ⚠️ `status = 'published'` : Établissement publié mais pas de verrouillage explicite des modifications

### ⚠️ Statut : PARTIELLEMENT GÉRÉ

**Ce qui manque** :
- ⚠️ **Verrouillage après validation DG** : Pas de logique empêchant modification après `status = 'published'`
- ⚠️ **Équipements cochables** : Champs existent mais pas d'interface dédiée "gestion équipements" dans page établissement

**Données déjà disponibles mais non exposées** :
- Toutes les données sont disponibles via API et formulaires

### 🔧 Ajouts minimaux nécessaires
- Ajouter vérification dans `AccommodationController::update()` : Si `status = 'published'`, désactiver modification ou demander validation admin
- Ou ajouter champ `is_locked` (boolean) dans `accommodations` pour verrouillage explicite

---

## 5. BOÎTE DE RÉCEPTION

### Structure cible
- Messages clients
- Notifications plateforme
- Alertes système
- Canal unique, pas de dispersion

### Implémentation actuelle

**Routes API** :
- ❌ Pas de route `/messages` ou `/notifications`
- ❌ Pas de contrôleur `MessageController` ou `NotificationController`

**Pages frontend** :
- ❌ Pas de page `/dashboard/host/messages` ou `/dashboard/host/inbox`

**Données disponibles** :
- ⚠️ Alertes affichées dans dashboard principal (réservations en attente, hébergements en attente)
- ⚠️ Informations client dans réservations (nom, email, téléphone)

### ❌ Statut : ABSENTE

**Ce qui manque** :
- ❌ **Système de messages** : Pas de table `messages` ou `conversations`
- ❌ **Notifications plateforme** : Pas de table `notifications`
- ❌ **Boîte de réception centralisée** : Pas de page dédiée

**Données déjà disponibles mais non exposées** :
- Informations client dans réservations (peuvent servir de base pour contacter)

### 🔧 Ajouts minimaux nécessaires
- Créer table `messages` (sender_id, recipient_id, booking_id, subject, body, read_at, created_at)
- Créer table `notifications` (user_id, type, title, message, read_at, created_at)
- Créer contrôleur `MessageController` et `NotificationController`
- Créer page `/dashboard/host/inbox` ou `/dashboard/host/messages`
- Routes API : `GET /messages`, `POST /messages`, `GET /notifications`, `PUT /notifications/{id}/read`

---

## 6. COMMENTAIRES CLIENTS

### Structure cible
- Note moyenne
- Avis
- Réponse hôte
- Aucune suppression possible côté hôte

### Implémentation actuelle

**Routes API** :
- `GET /accommodations/{id}/reviews` : ✅ Liste des avis
- `POST /reviews` : ✅ Créer avis (utilisateur uniquement)

**Contrôleur** : `ReviewController` ✅

**Modèle** : `Review` avec `category_ratings` (JSON)

**Pages frontend** :
- ❌ Pas de page `/dashboard/host/reviews` ou `/dashboard/host/comments`
- ⚠️ Avis affichés dans page établissement publique (`/accommodations/[id]`)

**Données disponibles** :
- `rating` : ✅ Note moyenne (calculée dans `accommodations`)
- `total_reviews` : ✅ Nombre total d'avis
- `category_ratings` : ✅ Notes par catégorie (propreté, équipements, etc.)
- `comment`, `comment_en` : ✅ Commentaires FR/EN
- `user` : ✅ Auteur de l'avis

### ⚠️ Statut : PARTIELLEMENT GÉRÉ

**Ce qui manque** :
- ❌ **Page dédiée commentaires** : Pas de page hôte pour voir tous les avis de ses établissements
- ❌ **Réponse hôte** : Pas de champ `host_response` dans table `reviews`
- ⚠️ **Suppression** : Pas de logique explicite empêchant suppression (mais pas de route DELETE non plus)

**Données déjà disponibles mais non exposées** :
- Toutes les données sont disponibles via API mais pas d'interface hôte dédiée

### 🔧 Ajouts minimaux nécessaires
- Créer page `/dashboard/host/reviews` : Liste tous les avis de tous les établissements du hôte
- Ajouter colonne `host_response` (text, nullable) dans table `reviews`
- Ajouter colonne `host_response_at` (timestamp, nullable) dans table `reviews`
- Route API : `PUT /reviews/{id}/response` (hôte uniquement)
- S'assurer qu'aucune route DELETE n'existe pour les avis côté hôte

---

## 7. PAIEMENTS

### Structure cible
- Paiements reçus
- Réservations non soldées
- Modes de paiement
- À terme : Commission, Solde net (EXCLU selon règles)

### Implémentation actuelle

**Page** : `/dashboard/host/revenue/page.tsx` ✅

**Routes API** :
- `GET /revenue/host` : ✅ Revenus hôte (via `RevenueController::hostRevenue()`)

**Données disponibles** :
- `statistics.total_revenue` : ✅ Revenus totaux
- `statistics.paid_revenue` : ✅ Revenus payés
- `statistics.pending_revenue` : ✅ Revenus en attente
- `statistics.total_bookings` : ✅ Total réservations
- `revenues.data` : ✅ Liste détaillée avec commission, host_amount, status
- `monthly_revenue` : ✅ Tendance mensuelle

**Affichage actuel** :
- ✅ Statistiques principales (lignes 114-160)
- ✅ Historique des revenus avec commission (lignes 163-214)
- ✅ Statut paiement (paid, pending)

**Dans page réservations** :
- ✅ Informations paiement par réservation (acompte, reste à payer, statut)
- ✅ Filtre par statut paiement (pending, paid, failed)

### ✅ Statut : COMPLÈTEMENT GÉRÉ (sans commission/solde net)
- Paiements reçus : ✅ Affichés
- Réservations non soldées : ✅ Identifiables via `pending_revenue` et filtres
- Modes de paiement : ⚠️ Mentionnés dans établissement mais pas de liste dédiée

**Note** : Commission et solde net sont exclus selon règles impératives.

### 🔧 Ajouts minimaux (optionnel)
- Ajouter section "Modes de paiement acceptés" dans page revenus (depuis `accommodations.payment_methods`)

---

## 8. ANALYSE (LIGHT)

### Structure cible
- Taux d'occupation
- Revenus par période
- Types de chambres les plus réservés
- Afférer un numéro à chaque réservation

### Implémentation actuelle

**Page** : `/dashboard/host/analytics/page.tsx` ✅

**Routes API** :
- `GET /analytics/host` : ✅ Dashboard analytics
- `GET /analytics/host/accommodation/{id}` : ✅ Stats par établissement

**Données disponibles** :
- `occupancy_rate` : ✅ Taux d'occupation (30 derniers jours)
- `revenue_this_month`, `revenue_last_month`, `revenue_growth` : ✅ Revenus par période
- `daily_revenue`, `weekly_revenue`, `monthly_revenue_current` : ✅ Revenus par période
- `monthly_revenue` : ✅ Tendance 12 derniers mois
- `accommodations_stats` : ✅ Stats par établissement
- `top_accommodations` : ✅ Top 5 établissements

**Affichage actuel** :
- ✅ Statistiques principales (lignes 179-238)
- ✅ Revenus par période (lignes 241-280)
- ✅ Graphique évolution 12 mois (lignes 283-329)
- ✅ Revenus par établissement (lignes 398-459)

**Numéro réservation** :
- ✅ `bookings.id` : ID unique de chaque réservation
- ⚠️ Pas de numéro de réservation formaté (ex: RES-2026-001)

### ⚠️ Statut : PARTIELLEMENT GÉRÉ

**Ce qui manque** :
- ⚠️ **Types de chambres les plus réservés** : Pas de statistique dédiée
- ⚠️ **Numéro réservation formaté** : Seulement `id` numérique, pas de format "RES-YYYY-NNN"

**Données déjà disponibles mais non exposées** :
- Données de réservations avec `room_id` peuvent être agrégées pour "types de chambres les plus réservés"

### 🔧 Ajouts minimaux nécessaires
- Ajouter calcul "Types de chambres les plus réservés" dans `AnalyticsController::hostDashboard()` : Agréger par `room.type` ou `room.room_category`
- Ajouter champ calculé `booking_number` (string) dans modèle `Booking` : Format "RES-{year}-{id}" ou utiliser accessor
- Afficher "Types de chambres les plus réservés" dans page analytics

---

## RÉSUMÉ PAR SECTION

| Section | Statut | Données disponibles | Interface frontend | Ajouts minimaux |
|---------|--------|---------------------|-------------------|-----------------|
| **1. Accueil** | ⚠️ Partielle | ✅ Oui | ✅ Oui | Réservations du jour, Arrivées/Départs, Chambres disponibles aujourd'hui |
| **2. Tarifs & disponibilités** | ⚠️ Partielle | ✅ Oui (API) | ❌ Non | Page dédiée avec calendrier |
| **3. Réservations** | ✅ Complète | ✅ Oui | ✅ Oui | Bouton "Contacter client" (optionnel) |
| **4. Établissement** | ⚠️ Partielle | ✅ Oui | ✅ Oui | Verrouillage après validation, Interface équipements |
| **5. Boîte de réception** | ❌ Absente | ⚠️ Partielle | ❌ Non | Système messages/notifications complet |
| **6. Commentaires** | ⚠️ Partielle | ✅ Oui (API) | ❌ Non | Page dédiée, Réponse hôte |
| **7. Paiements** | ✅ Complète | ✅ Oui | ✅ Oui | Section modes paiement (optionnel) |
| **8. Analyse** | ⚠️ Partielle | ✅ Oui | ✅ Oui | Types chambres réservés, Numéro réservation formaté |

---

## DONNÉES DÉJÀ DISPONIBLES MAIS NON EXPOSÉES

### Dans `AnalyticsController::hostDashboard()`
1. **Réservations du jour** : Peut être calculé depuis `daily_bookings` dans `accommodations_stats`
2. **Arrivées/Départs aujourd'hui** : Peut être filtré depuis `upcoming_bookings` avec `check_in = today` ou `check_out = today`
3. **Chambres disponibles aujourd'hui** : Peut être calculé depuis `room_stats` et réservations du jour

### Dans `BookingController::hostReservations()`
1. **Données par période** : `week`, `month`, `two_months`, `history` déjà disponibles
2. **Filtrage arrivées/départs** : Peut être ajouté avec filtres sur `check_in` et `check_out`

### Dans `RoomAvailabilityController`
1. **Calendrier complet** : `getCalendar()` retourne structure calendrier avec prix et statut
2. **Blocage dates** : `status = 'occupied'` ou `'maintenance'` permet blocage

### Dans `ReviewController`
1. **Tous les avis** : `GET /accommodations/{id}/reviews` retourne tous les avis
2. **Notes par catégorie** : `category_ratings` JSON contient notes détaillées

---

## AJOUTS MINIMAUX NÉCESSAIRES (sans redesign)

### 1. Accueil
- Calculer "Réservations du jour" depuis `daily_bookings` ou filtrer `hostReservations().week`
- Calculer "Arrivées aujourd'hui" : Filtrer `upcoming_bookings` où `check_in = today`
- Calculer "Départs aujourd'hui" : Filtrer `upcoming_bookings` où `check_out = today`
- Calculer "Chambres disponibles aujourd'hui" : `active_rooms_count - réservations_aujourd'hui`

### 2. Tarifs & disponibilités
- Créer page `/dashboard/host/accommodations/{id}/pricing` ou `/dashboard/host/tarifs-disponibilites`
- Intégrer composant calendrier utilisant API existante `getCalendar()`
- Afficher prix de base et suppléments depuis données `rooms`

### 3. Établissement
- Ajouter vérification verrouillage : Si `status = 'published'`, désactiver modification ou ajouter `is_locked`

### 4. Boîte de réception
- Créer tables `messages` et `notifications`
- Créer contrôleurs et routes API
- Créer page `/dashboard/host/inbox`

### 5. Commentaires
- Créer page `/dashboard/host/reviews`
- Ajouter colonnes `host_response` et `host_response_at` dans `reviews`
- Route API `PUT /reviews/{id}/response`

### 6. Analyse
- Ajouter calcul "Types de chambres les plus réservés" dans `AnalyticsController`
- Ajouter accessor `booking_number` dans modèle `Booking` (format "RES-YYYY-NNN")
- Afficher "Types de chambres les plus réservés" dans page analytics

---

## COMPATIBILITÉ AVEC L'EXISTANT

### ✅ Compatible
- Tous les ajouts proposés utilisent des données déjà disponibles
- Aucun redesign majeur nécessaire
- Ajouts de pages/composants sans modifier l'existant

### ⚠️ Attention
- Système messages/notifications nécessite création de tables (nouveau système)
- Verrouillage établissement peut nécessiter migration si ajout de `is_locked`

---

**Note** : Cette analyse identifie uniquement les écarts. Aucune solution technique n'est proposée, conformément aux règles impératives.
