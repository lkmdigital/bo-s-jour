# 📊 Comparaison : Étapes d'enregistrement vs Implémentation actuelle

**Date** : 2026-01-22  
**Objectif** : Identifier les champs manquants, existants et partiellement couverts pour chaque étape

---

## Structure de comparaison

Pour chaque étape du wizard actuel, identification de :
- ✅ **Champs existants** : Présents dans le wizard ET dans la base de données
- ⚠️ **Champs partiellement couverts** : Présents en base mais pas dans le wizard, ou inversement
- ❌ **Champs manquants** : Absents du wizard ET de la base de données (selon document fonctionnel)

---

## ÉTAPE 1 : Informations de base

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `name` | `accommodations` | ✅ Présent dans wizard et DB |
| `type` | `accommodations` | ✅ Présent (hotel, lodge, guesthouse, apartment) |
| `description` | `accommodations` | ✅ Présent (FR requis) |
| `description_en` | `accommodations` | ✅ Présent (EN optionnel, traduction auto) |

### ⚠️ Champs partiellement couverts

| Champ | Table | Statut | Description |
|-------|-------|--------|-------------|
| `establishment_name` | `users` | ⚠️ Existe en DB mais pas dans wizard | Nom de l'établissement (dans profil hôte, pas dans création établissement) |
| `accommodation_type` | `users` | ⚠️ Existe en DB mais pas dans wizard | Type d'hébergement (dans profil hôte, redondant avec `accommodations.type`) |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Nom légal de l'établissement** | Nom officiel enregistré (peut différer du nom commercial) | Nécessite colonne `legal_name` dans `accommodations` |
| **Raison sociale** | Nom juridique de l'entreprise | Nécessite colonne `legal_name` ou `company_name` dans `accommodations` |
| **Numéro d'enregistrement** | Numéro d'enregistrement officiel de l'établissement | Nécessite colonne `registration_number` dans `accommodations` |
| **Logo de l'établissement** | Logo officiel (différent des photos) | Nécessite colonne `logo_path` dans `accommodations` ou table `accommodation_logos` |

---

## ÉTAPE 2 : Localisation

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `address` | `accommodations` | ✅ Présent (requis) |
| `city` | `accommodations` | ✅ Présent (requis) |
| `latitude` | `accommodations` | ✅ Présent (requis, géolocalisation auto) |
| `longitude` | `accommodations` | ✅ Présent (requis, géolocalisation auto) |

### ⚠️ Champs partiellement couverts

| Champ | Table | Statut | Description |
|-------|-------|--------|-------------|
| `postal_code` | `users` | ⚠️ Existe en DB (users) mais pas dans wizard | Code postal (dans profil hôte, pas dans création établissement) |
| `country` | `users` | ⚠️ Existe en DB (users) mais pas dans wizard | Pays (dans profil hôte, défaut "Côte d'Ivoire") |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Code postal de l'établissement** | Code postal spécifique à l'établissement (peut différer du profil hôte) | Nécessite colonne `postal_code` dans `accommodations` |
| **Pays de l'établissement** | Pays spécifique (pour établissements internationaux) | Nécessite colonne `country` dans `accommodations` |
| **Quartier/Zone** | Quartier ou zone précise dans la ville | Nécessite colonne `district` ou `neighborhood` dans `accommodations` |
| **Points de repère** | Points de repère pour faciliter l'accès | Nécessite colonne `landmarks` (text) dans `accommodations` |
| **Instructions d'accès** | Instructions détaillées pour arriver à l'établissement | Nécessite colonne `access_instructions` (text) dans `accommodations` |

---

## ÉTAPE 3 : Informations sur l'établissement

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `opening_year` | `accommodations` | ✅ Présent (optionnel) |
| `star_rating` | `accommodations` | ✅ Présent (1-5 étoiles, optionnel) |
| `bedrooms` | `accommodations` | ✅ Présent (requis) |
| `room_types` | `accommodations` | ✅ Présent (JSON, optionnel) |
| `max_guests` | `accommodations` | ✅ Présent (requis) |
| `bathrooms` | `accommodations` | ✅ Présent (requis) |
| `conference_rooms_count` | `accommodations` | ✅ Présent (optionnel) |
| `conference_capacity` | `accommodations` | ✅ Présent (optionnel) |
| `restaurant_capacity` | `accommodations` | ✅ Présent (optionnel) |
| `bar_capacity` | `accommodations` | ✅ Présent (optionnel) |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Surface totale de l'établissement** | Surface en m² de l'établissement | Nécessite colonne `total_surface_area` (decimal) dans `accommodations` |
| **Nombre d'étages** | Nombre d'étages de l'établissement | Nécessite colonne `floors_count` (integer) dans `accommodations` |
| **Année de dernière rénovation** | Année de la dernière rénovation majeure | Nécessite colonne `last_renovation_year` (year) dans `accommodations` |
| **Certifications/Labels** | Certifications obtenues (ISO, éco-label, etc.) | Nécessite colonne `certifications` (JSON) dans `accommodations` |
| **Capacité parking** | Nombre de places de parking disponibles | Nécessite colonne `parking_capacity` (integer) dans `accommodations` |
| **Type de parking** | Parking couvert, extérieur, payant, gratuit | Nécessite colonne `parking_type` (enum) dans `accommodations` |
| **Accessibilité PMR** | Accessibilité pour personnes à mobilité réduite | Nécessite colonne `wheelchair_accessible` (boolean) dans `accommodations` |
| **Équipements PMR** | Détails des équipements PMR disponibles | Nécessite colonne `accessibility_features` (JSON) dans `accommodations` |

---

## ÉTAPE 4 : Tarifs et capacité

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `price_per_night` | `accommodations` | ✅ Présent (requis, calculé auto si types chambres) |
| `room_type_pricing` | `accommodations` | ✅ Présent (JSON, tarifs par type) |

### ⚠️ Champs partiellement couverts

| Champ | Table | Statut | Description |
|-------|-------|--------|-------------|
| `room_type_pricing.*.rooms_available` | `accommodations` | ⚠️ Présent mais non utilisé | Nombre de chambres par type (saisi mais pas de création auto de chambres) |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Tarifs selon saison** | Tarifs variables selon haute/basse saison | Nécessite table `accommodation_seasonal_pricing` ou colonne `seasonal_pricing` (JSON) |
| **Tarifs week-end** | Tarifs spécifiques pour week-end | Nécessite colonne `weekend_pricing` (decimal) dans `accommodations` |
| **Tarifs groupe** | Tarifs dégressifs pour groupes | Nécessite table `accommodation_group_pricing` ou colonne `group_pricing` (JSON) |
| **Suppléments** | Suppléments possibles (lit supplémentaire, etc.) | Nécessite table `accommodation_supplements` ou colonne `supplements` (JSON) |
| **Taxes et frais** | Taxes locales, frais de service | Nécessite colonne `taxes_included` (boolean) et `service_charge` (decimal) dans `accommodations` |
| **Politique de prix** | Politique de prix (fixe, négociable) | Nécessite colonne `pricing_policy` (enum) dans `accommodations` |

---

## ÉTAPE 5 : Services et équipements

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `amenities` | `accommodations` | ✅ Présent (JSON, checkboxes) |
| `shuttle_service` | `accommodations` | ✅ Présent (boolean) |
| `laundry` | `accommodations` | ✅ Présent (boolean) |
| `breakfast_price` | `accommodations` | ✅ Présent (decimal, optionnel) |
| `reception_24h` | `accommodations` | ✅ Présent (boolean) |
| `smoking_area` | `accommodations` | ✅ Présent (boolean) |
| `pets_allowed` | `accommodations` | ✅ Présent (boolean) |
| `other_amenities` | `accommodations` | ✅ Présent (text, optionnel) |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Services spa/wellness** | Services de spa, massage, bien-être | Nécessite colonne `spa_services` (JSON) dans `accommodations` |
| **Services business** | Services business (centre d'affaires, imprimante, etc.) | Nécessite colonne `business_services` (JSON) dans `accommodations` |
| **Services enfants** | Services pour enfants (garde d'enfants, aire de jeux, etc.) | Nécessite colonne `children_services` (JSON) dans `accommodations` |
| **Équipements sportifs** | Équipements sportifs disponibles | Nécessite colonne `sports_facilities` (JSON) dans `accommodations` |
| **Services de conciergerie** | Services de conciergerie disponibles | Nécessite colonne `concierge_services` (JSON) dans `accommodations` |
| **Langues parlées** | Langues parlées par le personnel | Nécessite colonne `spoken_languages` (JSON) dans `accommodations` |

---

## ÉTAPE 6 : Politique

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `deposit_required` | `accommodations` | ✅ Présent (boolean, défaut true) |
| `deposit_amount` | `accommodations` | ✅ Présent (enum: first_night, percentage, fixed) |
| `cancellation_policy_hours` | `accommodations` | ✅ Présent (integer, défaut 48) |
| `payment_methods` | `accommodations` | ✅ Présent (JSON) |
| `special_conditions` | `accommodations` | ✅ Présent (text, optionnel) |
| `breakfast_included` | `accommodations` | ✅ Présent (boolean) |
| `breakfast_included_persons` | `accommodations` | ✅ Présent (integer, 0-10) |
| `check_in_time` | `accommodations` | ✅ Présent (time, optionnel) |
| `check_out_time` | `accommodations` | ✅ Présent (time, optionnel) |
| `invoice_paid_before_hours` | `accommodations` | ✅ Présent (integer, défaut 48) |

### ⚠️ Champs partiellement couverts

| Champ | Table | Statut | Description |
|-------|-------|--------|-------------|
| `deposit_amount` (valeur) | `accommodations` | ⚠️ Type présent mais pas la valeur | Si `deposit_amount = 'percentage'` ou `'fixed'`, pas de champ pour la valeur |
| `payment_methods` | `accommodations` | ⚠️ Champ présent mais message informatif | Message indique "géré automatiquement", pas de saisie réelle |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Valeur de l'acompte (pourcentage)** | Si `deposit_amount = 'percentage'`, valeur du pourcentage | Nécessite colonne `deposit_percentage` (decimal) dans `accommodations` |
| **Valeur de l'acompte (fixe)** | Si `deposit_amount = 'fixed'`, montant fixe | Nécessite colonne `deposit_fixed_amount` (decimal) dans `accommodations` |
| **Politique d'annulation flexible** | Politique d'annulation différente selon le type de réservation | Nécessite table `accommodation_cancellation_policies` ou colonne `cancellation_policies` (JSON) |
| **Politique de remboursement** | Politique de remboursement en cas d'annulation | Nécessite colonne `refund_policy` (text) dans `accommodations` |
| **Politique de modification** | Politique de modification de réservation | Nécessite colonne `modification_policy` (text) dans `accommodations` |
| **Règles de séjour** | Règles de séjour spécifiques (heures de silence, etc.) | Nécessite colonne `house_rules` (text) dans `accommodations` |
| **Politique d'âge minimum** | Âge minimum pour réserver | Nécessite colonne `minimum_age` (integer) dans `accommodations` |
| **Politique de fumeurs** | Politique détaillée sur le tabagisme | Nécessite colonne `smoking_policy` (enum: allowed, not_allowed, designated_areas) dans `accommodations` |

---

## ÉTAPE 7 : Médias

### ✅ Champs existants

| Champ | Table | Statut |
|-------|-------|--------|
| `accommodation_images` | `accommodation_images` | ✅ Table dédiée avec upload |
| `is_primary` | `accommodation_images` | ✅ Image principale |
| `order` | `accommodation_images` | ✅ Ordre d'affichage |

### ⚠️ Champs partiellement couverts

| Champ | Table | Statut | Description |
|-------|-------|--------|-------------|
| **Validation nombre d'images** | Frontend | ⚠️ Validation frontend uniquement | Minimum 6 photos validé côté frontend, pas de validation backend après upload |

### ❌ Champs manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Vidéos de présentation** | Vidéos de présentation de l'établissement (différentes des photos) | Nécessite colonne `video_url` ou table `accommodation_videos` |
| **Vidéos 360°** | Visites virtuelles 360° | Nécessite colonne `virtual_tour_url` dans `accommodations` |
| **Plans/Plans d'étage** | Plans de l'établissement | Nécessite table `accommodation_floor_plans` ou colonne `floor_plans` (JSON) |
| **Documents officiels** | Documents officiels (permis, certificats) | Nécessite table `accommodation_documents` |
| **Galerie par catégorie** | Organisation des médias par catégorie (extérieur, intérieur, chambres, etc.) | Nécessite colonne `category` dans `accommodation_images` |

---

## ÉTAPES MANQUANTES (non présentes dans le wizard actuel)

### ❌ ÉTAPE 8 : Informations légales et administratives

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **RCCM** | Numéro RCCM (Registre du Commerce et du Crédit Mobilier) | ⚠️ Existe dans `users.rccm` mais pas dans `accommodations` - Nécessite colonne `rccm` dans `accommodations` |
| **Numéro CNPS** | Numéro CNPS (Caisse Nationale de Prévoyance Sociale) | ⚠️ Existe dans `users.cnps_number` mais pas dans `accommodations` - Nécessite colonne `cnps_number` dans `accommodations` |
| **Numéro compte contribuable** | Numéro de compte contribuable (fiscal) | ⚠️ Existe dans `users.tax_account_number` mais pas dans `accommodations` - Nécessite colonne `tax_account_number` dans `accommodations` |
| **Permis d'exploitation** | Numéro de permis d'exploitation hôtelière | Nécessite colonne `operating_license_number` dans `accommodations` |
| **Date d'expiration du permis** | Date d'expiration du permis d'exploitation | Nécessite colonne `operating_license_expires_at` (date) dans `accommodations` |
| **Document permis** | Fichier du permis d'exploitation | Nécessite colonne `operating_license_path` dans `accommodations` |
| **Assurance responsabilité civile** | Numéro d'assurance responsabilité civile | Nécessite colonne `liability_insurance_number` dans `accommodations` |
| **Date expiration assurance** | Date d'expiration de l'assurance | Nécessite colonne `insurance_expires_at` (date) dans `accommodations` |

### ❌ ÉTAPE 9 : Coordonnées et contact

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Téléphone fixe de l'établissement** | Téléphone fixe spécifique à l'établissement | ⚠️ Existe dans `users.phone_fixed` mais pas dans `accommodations` - Nécessite colonne `phone_fixed` dans `accommodations` |
| **WhatsApp de l'établissement** | Numéro WhatsApp spécifique à l'établissement | ⚠️ Existe dans `users.whatsapp` mais pas dans `accommodations` - Nécessite colonne `whatsapp` dans `accommodations` |
| **Site web de l'établissement** | Site web spécifique à l'établissement | ⚠️ Existe dans `users.website` mais pas dans `accommodations` - Nécessite colonne `website` dans `accommodations` |
| **Page Facebook de l'établissement** | Page Facebook spécifique à l'établissement | ⚠️ Existe dans `users.facebook_page` mais pas dans `accommodations` - Nécessite colonne `facebook_page` dans `accommodations` |
| **Email de contact établissement** | Email spécifique à l'établissement (peut différer de l'email hôte) | Nécessite colonne `contact_email` dans `accommodations` |
| **Horaires de réception** | Horaires détaillés de la réception | Nécessite colonne `reception_hours` (JSON) dans `accommodations` |
| **Personne à contacter** | Nom et fonction de la personne à contacter | Nécessite colonne `contact_person_name` et `contact_person_title` dans `accommodations` |

### ❌ ÉTAPE 10 : Inspection et validation

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Demande d'inspection** | Possibilité de demander une inspection lors de la création | ✅ Table `inspections` existe - Nécessite intégration dans le wizard |
| **Rendez-vous inspection** | Planification d'un rendez-vous d'inspection | ✅ Table `appointments` existe - Nécessite intégration dans le wizard |
| **Documents à fournir** | Liste des documents requis pour l'approbation | Nécessite table `accommodation_required_documents` ou colonne `required_documents` (JSON) |
| **Statut de complétion** | Indicateur de complétion du dossier (pourcentage) | Nécessite colonne `completion_percentage` (integer) dans `accommodations` |

---

## RÉSUMÉ PAR CATÉGORIE

### Champs existants (✅) : **24 champs**
Tous les champs de base sont présents dans le wizard et la base de données.

### Champs partiellement couverts (⚠️) : **12 champs**
- Champs dans `users` mais pas dans `accommodations` (établissement vs profil hôte)
- Champs présents mais avec messages informatifs uniquement
- Champs présents mais non utilisés (ex: `room_type_pricing.rooms_available`)

### Champs manquants (❌) : **50+ champs**
Répartis en :
- **Informations légales** : 8 champs
- **Coordonnées établissement** : 7 champs
- **Localisation détaillée** : 5 champs
- **Établissement détaillé** : 8 champs
- **Tarification avancée** : 6 champs
- **Services détaillés** : 6 champs
- **Politiques détaillées** : 8 champs
- **Médias avancés** : 5 champs
- **Workflow inspection** : 4 champs

---

## DÉPENDANCES IDENTIFIÉES

### Dépendances structurelles
1. **Séparation profil hôte / établissement** : Certains champs existent dans `users` mais devraient être dans `accommodations` (RCCM, CNPS, tax_account_number, phone_fixed, whatsapp, website, facebook_page)
2. **Création automatique de chambres** : Le champ `room_type_pricing.rooms_available` est saisi mais ne crée pas automatiquement les chambres
3. **Workflow d'inspection** : Les tables `inspections` et `appointments` existent mais ne sont pas intégrées au wizard

### Dépendances fonctionnelles
1. **Validation backend médias** : Validation frontend uniquement pour le minimum de 6 photos
2. **Politique d'acompte** : Type présent mais pas de valeur pour percentage/fixed
3. **Moyens de paiement** : Champ JSON présent mais message informatif uniquement

---

**Note** : Cette analyse est basée sur l'exploration du code actuel. Le document fonctionnel `.docx` n'a pas pu être lu directement, mais cette comparaison identifie les écarts probables entre les attentes fonctionnelles et l'implémentation actuelle.
