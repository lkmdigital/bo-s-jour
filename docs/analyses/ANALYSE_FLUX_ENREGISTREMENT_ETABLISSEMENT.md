# 📋 Analyse du flux d'enregistrement d'un établissement

## 🔍 Exploration du projet actuel

**Date d'analyse** : 2026-01-22  
**Objectif** : Identifier le fonctionnement ACTUEL sans proposer de modifications

---

## 1. FLUX D'ENREGISTREMENT ACTUEL

### 1.1 Point d'entrée

**Route frontend** : `/dashboard/host/accommodations/new`  
**Composant** : `AccommodationCreationWizard` (mode: "host")  
**Route backend** : `POST /api/accommodations` (middleware: `role:host`)

### 1.2 Prérequis (vérifiés dans `AccommodationController::store()`)

**Lignes 493-511** :
- ✅ **Profil hôte complété** : `$user->profile_completed === true`
- ✅ **Profil hôte vérifié** : `$user->profile_verified === true`
- ❌ Si non complété → Erreur 403 : "Votre profil doit être complété à 100%"
- ❌ Si non vérifié → Erreur 403 : "Votre profil est en attente de vérification"

### 1.3 Étapes du wizard (7 étapes)

**Composant** : `AccommodationCreationWizard.tsx` (lignes 124-132)

1. **Étape 1 : Informations de base** (`basic`)
   - Nom (requis)
   - Type (hotel, lodge, guesthouse, apartment)
   - Description FR (requis)
   - Description EN (optionnel, avec traduction automatique)

2. **Étape 2 : Localisation** (`location`)
   - Adresse (requis)
   - Ville (requis)
   - Latitude/Longitude (requis, avec géolocalisation automatique ou manuelle)
   - Aperçu Google Maps

3. **Étape 3 : Établissement** (`establishment`)
   - Année d'ouverture (optionnel)
   - Classement étoiles (1-5, optionnel)
   - Nombre de chambres (requis)
   - Types de chambres (checkboxes, optionnel)
   - Capacité max (requis)
   - Salles de bain (requis)
   - Salles de conférence (nombre, capacité)
   - Restaurant/Bar (capacités)

4. **Étape 4 : Tarifs** (`pricing`)
   - Prix par nuit de base (requis, désactivé si types de chambres sélectionnés)
   - Tarifs par type de chambre (si types sélectionnés) :
     - Nombre de chambres pour ce type (optionnel)
     - Tarif par nuit (requis)

5. **Étape 5 : Services** (`services`)
   - Équipements de base (checkboxes : Wi-Fi, Climatisation, Piscine, etc.)
   - Services supplémentaires (checkboxes : Navette, Buanderie, Réception 24h, etc.)
   - Tarif petit déjeuner (optionnel)
   - Autres équipements (textarea)

6. **Étape 6 : Politique** (`policy`)
   - **Acompte** : Message informatif (géré automatiquement par la plateforme)
   - **Politique d'annulation** : Message informatif (48h par défaut)
   - **Moyens de paiement** : Message informatif (liste affichée)
   - **Petit déjeuner inclus** : Checkbox + nombre de personnes (1 ou 2)
   - **Horaires** : Check-in/Check-out (time picker)
   - **Facture soldée** : Message informatif (48h avant arrivée)
   - **Conditions particulières** : Message informatif

7. **Étape 7 : Médias** (`media`)
   - **Minimum 6 photos requises** (validation frontend ligne 259)
   - Maximum 10 fichiers
   - Formats : JPG, PNG, WEBP, MP4, MOV
   - Taille max : 20 Mo par fichier
   - Upload séparé après création de l'établissement

---

## 2. ENDPOINTS CONCERNÉS

### 2.1 Création de l'établissement

**Route** : `POST /api/accommodations`  
**Contrôleur** : `AccommodationController::store()`  
**Middleware** : `role:host`  
**Validation** : Lignes 513-560

**Champs validés** :
- Informations de base (name, type, description, description_en)
- Localisation (address, city, latitude, longitude)
- Capacité (max_guests, bedrooms, bathrooms)
- Tarifs (price_per_night, room_type_pricing)
- Établissement (opening_year, star_rating, room_types, conference_rooms_count, etc.)
- Services (amenities, shuttle_service, laundry, breakfast_price, etc.)
- Politique (deposit_required, cancellation_policy_hours, payment_methods, check_in_time, check_out_time, etc.)

**Création** : Lignes 577-620
- Génération automatique du `slug` (unique)
- Statut initial : `'pending'`
- Enregistrement de tous les champs validés

### 2.2 Upload des médias

**Route** : `POST /api/accommodations/{id}/media`  
**Contrôleur** : `AccommodationController::uploadMedia()`  
**Middleware** : `role:host` (ou admin)  
**Fichiers** : Format `media[]` (tableau)

**Processus** :
- Upload dans `storage/app/public/accommodations/{id}/`
- Copie dans `public/storage/accommodations/{id}/` (pour mutualisé hosting)
- Création d'enregistrements dans `accommodation_images`
- Génération d'URLs complètes

### 2.3 Workflow d'approbation

**Routes admin** :
- `POST /api/admin/accommodations/{id}/approve` → Statut `published`
- `POST /api/admin/accommodations/{id}/reject` → Statut `rejected` (avec motif requis)
- `POST /api/admin/accommodations/{id}/remove` → Statut `removed` (avec motif requis)
- `POST /api/admin/accommodations/{id}/disable` → Statut `disabled`
- `POST /api/admin/accommodations/{id}/enable` → Statut `published`

**Audit logs** : Toutes les actions admin créent un `AccommodationAuditLog`

---

## 3. ENTITÉS MÉTIERS IDENTIFIÉES

### 3.1 Hébergement (Accommodation)

**Table** : `accommodations`  
**Modèle** : `App\Models\Accommodation`

**Champs principaux** :
- Identité : `name`, `slug`, `type`, `description`, `description_en`
- Localisation : `address`, `city`, `latitude`, `longitude`
- Capacité : `max_guests`, `bedrooms`, `bathrooms`
- Tarification : `price_per_night`, `room_type_pricing` (JSON)
- Établissement : `opening_year`, `star_rating`, `room_types` (JSON), `conference_rooms_count`, `conference_capacity`, `restaurant_capacity`, `bar_capacity`
- Services : `amenities` (JSON), `shuttle_service`, `laundry`, `breakfast_price`, `reception_24h`, `smoking_area`, `pets_allowed`, `other_amenities`
- Politique : `deposit_required`, `deposit_amount`, `cancellation_policy_hours`, `payment_methods` (JSON), `special_conditions`, `breakfast_included`, `breakfast_included_persons`, `check_in_time`, `check_out_time`, `invoice_paid_before_hours`
- Statut : `status` (pending, published, rejected, unavailable, renovation, removed, disabled)
- Relations : `host_id` → `users.id`

**Relations** :
- `hasMany(Room::class)` → Chambres
- `hasMany(AccommodationImage::class)` → Images
- `hasMany(Booking::class)` → Réservations
- `hasMany(Review::class)` → Avis
- `hasMany(Promotion::class)` → Promotions
- `hasMany(Inspection::class)` → Inspections
- `hasMany(AccommodationAuditLog::class)` → Historique des modifications

### 3.2 Chambres (Room)

**Table** : `rooms`  
**Modèle** : `App\Models\Room`

**Champs principaux** :
- Identité : `name`, `name_en`, `type`, `description`, `description_en`
- Capacité : `capacity`, `bedrooms`, `bathrooms`
- Tarification : `price_per_night`
- Quantité : `quantity` (nombre total de chambres de ce type)
- Statut : `is_active` (boolean)
- Équipements : `amenities` (JSON)
- Champs détaillés : 38+ champs (room_category, room_subcategory, bedding, surface_area, bathroom_features, etc.)
- Relations : `accommodation_id` → `accommodations.id`

**Relations** :
- `belongsTo(Accommodation::class)`
- `hasMany(RoomImage::class)` → Images
- `hasMany(RoomAvailability::class)` → Disponibilités
- `hasMany(Booking::class)` → Réservations

**Note** : Les chambres sont créées **APRÈS** l'établissement, via une interface séparée (`/dashboard/host/accommodations/{id}/rooms/new`)

### 3.3 Médias (AccommodationImage)

**Table** : `accommodation_images`  
**Modèle** : `App\Models\AccommodationImage`

**Champs** :
- `accommodation_id` → `accommodations.id`
- `url` (chemin relatif)
- `is_primary` (boolean)
- `order` (integer)

**Note** : Les images sont uploadées **APRÈS** la création de l'établissement, dans une étape séparée du wizard.

### 3.4 Services et politiques

**Stockage** : Directement dans la table `accommodations` (colonnes dédiées ou JSON)

**Services** :
- `amenities` (JSON) : Liste d'équipements sélectionnés
- `shuttle_service`, `laundry`, `reception_24h`, `smoking_area`, `pets_allowed` (booleans)
- `breakfast_price` (decimal)
- `other_amenities` (text)

**Politiques** :
- `deposit_required`, `deposit_amount`, `cancellation_policy_hours`
- `payment_methods` (JSON)
- `special_conditions` (text)
- `breakfast_included`, `breakfast_included_persons`
- `check_in_time`, `check_out_time`
- `invoice_paid_before_hours`

**Note** : Certains champs sont informatifs uniquement (messages dans le wizard indiquant que c'est géré automatiquement par la plateforme).

---

## 4. ÉCRANS ET COMPOSANTS FRONTEND

### 4.1 Page de création

**Fichier** : `app/dashboard/host/accommodations/new/page.tsx`  
**Composant principal** : `AccommodationCreationWizard`

**Fonctionnalités** :
- Wizard multi-étapes (7 étapes)
- Navigation entre étapes (précédent/suivant)
- Indicateur de progression visuel
- Validation par étape
- Traduction automatique description (API MyMemory)
- Géolocalisation automatique (navigator.geolocation)
- Aperçu Google Maps
- Upload de médias avec prévisualisation
- Validation finale : minimum 6 photos

### 4.2 Composants utilisés

- `Header` : En-tête de navigation
- `ErrorDisplay` : Affichage des erreurs
- `Image` (Next.js) : Prévisualisation des médias
- Formulaires React Hook Form

---

## 5. FONCTIONNEMENT ACTUEL DÉTAILLÉ

### 5.1 Création de l'établissement

**Séquence** :
1. Hôte remplit le wizard (7 étapes)
2. Validation frontend : minimum 6 photos
3. Soumission → `POST /api/accommodations`
4. Validation backend :
   - Profil hôte complété et vérifié
   - Tous les champs requis présents
   - Génération du slug unique
5. Création de l'enregistrement avec `status = 'pending'`
6. Upload des médias (séparé, après création)
7. Redirection vers `/dashboard/host`

### 5.2 Upload des médias

**Séquence** :
1. Après création réussie de l'établissement
2. Upload via `POST /api/accommodations/{id}/media`
3. Format : `FormData` avec `media[]` (tableau de fichiers)
4. Stockage : `storage/app/public/accommodations/{id}/`
5. Copie : `public/storage/accommodations/{id}/` (pour accessibilité web)
6. Enregistrement dans `accommodation_images`

### 5.3 Workflow d'approbation

**Séquence** :
1. Établissement créé avec `status = 'pending'`
2. Admin consulte la liste (`GET /api/admin/accommodations?status=pending`)
3. Admin peut :
   - **Approuver** → `status = 'published'` (visible publiquement)
   - **Rejeter** → `status = 'rejected'` (avec motif requis)
   - **Retirer** → `status = 'removed'` (avec motif requis)
   - **Désactiver** → `status = 'disabled'`
   - **Réactiver** → `status = 'published'`
4. Chaque action crée un `AccommodationAuditLog`

### 5.4 Création des chambres

**Séquence** (séparée de la création de l'établissement) :
1. Hôte accède à `/dashboard/host/accommodations/{id}/rooms/new`
2. Formulaire simple : nom, type, description, capacité, prix, chambres, salles de bain, quantité
3. Soumission → `POST /api/accommodations/{id}/rooms`
4. Chambre créée avec `is_active = false` (par défaut)
5. Hôte doit ajouter minimum 3 images pour activer la chambre
6. Upload images : `POST /api/accommodations/{id}/rooms/{roomId}/images`

---

## 6. CE QUI EST DÉJÀ GÉRÉ

### ✅ Complètement géré

1. **Wizard multi-étapes** : 7 étapes avec navigation
2. **Validation profil hôte** : Vérification `profile_completed` et `profile_verified`
3. **Génération slug** : Automatique et unique
4. **Upload médias** : Support images et vidéos, stockage avec URLs complètes
5. **Workflow d'approbation** : Approuver/rejeter/retirer/désactiver avec audit logs
6. **Géolocalisation** : Détection automatique ou saisie manuelle
7. **Traduction** : Description EN automatique (API MyMemory)
8. **Types de chambres** : Sélection et tarification par type
9. **Services** : Équipements, services supplémentaires, petit déjeuner
10. **Politiques** : Acompte, annulation, paiement, horaires (partiellement informatif)
11. **Création chambres** : Interface séparée après création établissement
12. **Gestion images chambres** : Upload, suppression, image principale, réorganisation

### ⚠️ Partiellement géré

1. **Politique d'acompte** :
   - ✅ Champ `deposit_required`, `deposit_amount` dans la table
   - ⚠️ Message informatif dans le wizard : "Géré automatiquement par la plateforme"
   - ❓ Logique métier : Non visible dans le code (peut-être dans `BookingController`)

2. **Politique d'annulation** :
   - ✅ Champ `cancellation_policy_hours` dans la table
   - ⚠️ Message informatif : "48 heures par défaut"
   - ❓ Application : Non visible dans le code

3. **Moyens de paiement** :
   - ✅ Champ `payment_methods` (JSON) dans la table
   - ⚠️ Message informatif : "Proposés automatiquement"
   - ❓ Activation : Non visible dans le code

4. **Conditions particulières** :
   - ✅ Champ `special_conditions` dans la table
   - ⚠️ Message informatif : "Intégrées par l'équipe Mon Beau Pays"
   - ❓ Gestion : Non visible dans le code

5. **Tarification par type de chambre** :
   - ✅ Champs `room_types` et `room_type_pricing` (JSON) dans la table
   - ✅ Saisie dans le wizard
   - ⚠️ Utilisation : Non visible dans le code (peut-être pour affichage uniquement)

### ❌ N'existe pas

1. **Inspection avant approbation** :
   - ✅ Table `inspections` existe
   - ✅ Contrôleur `InspectionController` existe
   - ❌ **Lien automatique** : Pas de workflow automatique inspection → approbation
   - ❌ **Obligation** : Pas de validation requise avant approbation

2. **Visite sur site (appointment)** :
   - ✅ Table `appointments` existe
   - ✅ Route `POST /api/accommodations/{id}/appointments` existe
   - ❌ **Intégration wizard** : Pas d'étape dans le wizard pour demander une visite
   - ❌ **Workflow** : Pas de lien automatique avec l'approbation

3. **Validation des médias** :
   - ✅ Validation frontend : minimum 6 photos
   - ❌ **Validation backend** : Pas de vérification du nombre d'images après upload
   - ❌ **Rejet automatique** : Pas de rejet si moins de 6 images après création

4. **Notifications** :
   - ❌ Pas de notification email à l'hôte après création
   - ❌ Pas de notification admin pour nouvel établissement en attente
   - ❌ Pas de notification hôte après approbation/rejet

5. **Étapes post-création** :
   - ❌ Pas de workflow guidé après création (ex: "Ajoutez vos chambres maintenant")
   - ❌ Pas de checklist de complétion (médias, chambres, disponibilités)

---

## 7. STRUCTURE DE DONNÉES

### 7.1 Table `accommodations`

**Colonnes principales** (d'après migrations et modèle) :
- `id`, `host_id`, `name`, `slug`, `type`, `description`, `description_en`
- `address`, `city`, `latitude`, `longitude`
- `price_per_night`, `max_guests`, `bedrooms`, `bathrooms`
- `amenities` (JSON)
- `status` (enum: pending, published, rejected, unavailable, renovation, removed, disabled)
- `is_featured`, `rating`, `total_reviews`
- `opening_year`, `star_rating`
- `room_types` (JSON), `room_type_pricing` (JSON)
- `conference_rooms_count`, `conference_capacity`
- `restaurant_capacity`, `bar_capacity`
- `shuttle_service`, `laundry`, `breakfast_price`
- `reception_24h`, `smoking_area`, `pets_allowed`
- `other_amenities`
- `deposit_required`, `deposit_amount`, `cancellation_policy_hours`
- `payment_methods` (JSON)
- `special_conditions`
- `breakfast_included`, `breakfast_included_persons`
- `check_in_time`, `check_out_time`
- `invoice_paid_before_hours`
- `created_at`, `updated_at`

### 7.2 Table `rooms`

**Colonnes principales** :
- `id`, `accommodation_id`, `name`, `name_en`, `type`
- `description`, `description_en`
- `capacity`, `price_per_night`
- `amenities` (JSON)
- `bedrooms`, `bathrooms`
- `is_active` (boolean)
- `quantity` (int, nombre total de chambres de ce type)
- 38+ champs détaillés (room_category, room_subcategory, bedding, surface_area, etc.)
- `created_at`, `updated_at`

### 7.3 Table `accommodation_images`

**Colonnes** :
- `id`, `accommodation_id`, `url`, `is_primary`, `order`
- `created_at`, `updated_at`

---

## 8. ROUTES API IDENTIFIÉES

### 8.1 Création et gestion (Host)

- `POST /api/accommodations` → Créer un établissement
- `POST /api/accommodations/{id}/media` → Upload médias
- `DELETE /api/accommodations/{accommodationId}/media/{imageId}` → Supprimer image
- `POST /api/accommodations/{accommodationId}/media/{imageId}/primary` → Image principale
- `PUT /api/accommodations/{id}` → Modifier
- `DELETE /api/accommodations/{id}` → Supprimer
- `GET /api/accommodations/my` → Liste des établissements de l'hôte

### 8.2 Gestion admin

- `GET /api/admin/accommodations` → Liste (avec filtres)
- `POST /api/admin/accommodations` → Créer (par admin)
- `GET /api/admin/accommodations/{id}` → Détails
- `POST /api/admin/accommodations/{id}/approve` → Approuver
- `POST /api/admin/accommodations/{id}/reject` → Rejeter
- `POST /api/admin/accommodations/{id}/remove` → Retirer
- `POST /api/admin/accommodations/{id}/disable` → Désactiver
- `POST /api/admin/accommodations/{id}/enable` → Réactiver

### 8.3 Chambres (Host)

- `GET /api/accommodations/{accommodationId}/rooms` → Liste
- `GET /api/accommodations/{accommodationId}/rooms/{id}` → Détails
- `POST /api/accommodations/{accommodationId}/rooms` → Créer
- `PUT /api/accommodations/{accommodationId}/rooms/{id}` → Modifier
- `DELETE /api/accommodations/{accommodationId}/rooms/{id}` → Supprimer
- `POST /api/accommodations/{accommodationId}/rooms/{roomId}/images` → Upload images
- `DELETE /api/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}` → Supprimer image
- `POST /api/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}/primary` → Image principale

### 8.4 Chambres (Admin)

- `GET /api/admin/accommodations/{accommodationId}/rooms` → Liste (toutes, actives et inactives)
- `POST /api/admin/accommodations/{accommodationId}/rooms/{roomId}/toggle-status` → Activer/Désactiver

---

## 9. RÉSUMÉ : CE QUI EST GÉRÉ / PARTIELLEMENT / MANQUANT

### ✅ Complètement géré

1. ✅ Wizard 7 étapes avec validation
2. ✅ Vérification profil hôte (complété + vérifié)
3. ✅ Création établissement avec tous les champs
4. ✅ Upload médias (images/vidéos, 6 minimum)
5. ✅ Workflow d'approbation admin (approve/reject/remove/disable)
6. ✅ Audit logs pour toutes les actions admin
7. ✅ Création chambres (interface séparée)
8. ✅ Gestion images chambres
9. ✅ Géolocalisation automatique
10. ✅ Traduction automatique description

### ⚠️ Partiellement géré

1. ⚠️ **Politique d'acompte** : Champs présents, logique métier non visible
2. ⚠️ **Politique d'annulation** : Champ présent, application non visible
3. ⚠️ **Moyens de paiement** : Champ JSON présent, activation non visible
4. ⚠️ **Conditions particulières** : Champ présent, gestion non visible
5. ⚠️ **Tarification par type** : Champs présents, utilisation non visible

### ❌ N'existe pas

1. ❌ **Inspection obligatoire** : Pas de workflow automatique inspection → approbation
2. ❌ **Visite sur site** : Pas d'intégration dans le wizard
3. ❌ **Validation médias backend** : Pas de vérification nombre d'images après upload
4. ❌ **Notifications** : Pas d'emails (création, approbation, rejet)
5. ❌ **Workflow guidé post-création** : Pas de checklist ou étapes suivantes
6. ❌ **Lien chambres ↔ établissement** : Création séparée, pas de création automatique depuis `room_type_pricing`

---

## 10. INFORMATIONS NON VISIBLES DANS LE CODE

Les éléments suivants sont mentionnés dans les messages informatifs du wizard mais **ne sont pas visibles dans le code analysé** :

1. **Logique d'acompte** : Comment est calculé/appliqué l'acompte selon `deposit_amount` ?
2. **Application politique d'annulation** : Comment les 48h (ou `cancellation_policy_hours`) sont-elles appliquées ?
3. **Activation moyens de paiement** : Comment les `payment_methods` sont-ils activés/désactivés ?
4. **Intégration conditions particulières** : Comment `special_conditions` est-il communiqué aux voyageurs ?
5. **Utilisation `room_type_pricing`** : Est-ce utilisé pour l'affichage uniquement ou pour la réservation ?
6. **Commission 10%** : Mentionnée dans le wizard, logique non visible (peut-être dans `Commission` model)

---

**Note** : Cette analyse décrit uniquement ce qui existe actuellement dans le code. Aucune modification n'est proposée.
