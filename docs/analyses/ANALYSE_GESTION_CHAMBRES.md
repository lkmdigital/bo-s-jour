# 📊 Analyse : Gestion actuelle des chambres vs Exigences document fonctionnel

**Date** : 2026-01-22  
**Objectif** : Comparer la gestion actuelle des chambres avec les exigences du document fonctionnel  
**Règle** : Ne pas fusionner ou renommer des concepts existants

---

## Structure de comparaison

Pour chaque sous-section des exigences :
- ✅ **Ce qui existe** : Présent dans le code et fonctionnel
- ⚠️ **Ce qui manque** : Absent du code actuel
- 🔧 **Ce qui peut être ajouté** : Peut être ajouté sans casser l'existant

---

## 1. TYPES DE CHAMBRES

### Document fonctionnel
Types disponibles :
- Single
- Double
- Twin
- Chambre communicante
- Suite
- Studio
- Appartement
- Villa

### Implémentation actuelle

**Modèle Room** :
- `type` (string) : Type libre
- `room_category` (string) : single, double, twin, triple, pmr, suite, other
- `room_subcategory` (string) : standard, confort, superieure, deluxe, premium, junior, familiale, executive, studio, appartement, bungalow, villa

**Formulaire simple** (`NewRoomPage`) :
- Types disponibles : Chambre simple, Chambre double, Suite, Studio, Appartement, Chambre familiale, Dortoir, Autre

**Formulaire avancé** (`EnhancedRoomForm`) :
- Catégories : single, double, twin, triple, pmr, suite, other
- Sous-catégories selon catégorie

### ✅ Ce qui existe
- ✅ Types de base : Single, Double, Twin, Suite, Studio, Appartement, Villa (via `room_category` et `room_subcategory`)
- ✅ Système de catégorisation : `room_category` + `room_subcategory`
- ✅ Labels automatiques : `getCategoryLabelAttribute()`, `getSubcategoryLabelAttribute()`

### ⚠️ Ce qui manque
- ⚠️ **Chambre communicante** : Absent des options disponibles
- ⚠️ **Utilisation incohérente** : Le formulaire simple (`NewRoomPage`) n'utilise pas `room_category`/`room_subcategory`, seulement `type` libre

### 🔧 Ce qui peut être ajouté
- Ajouter "Chambre communicante" dans les options `CATEGORIES` de `EnhancedRoomForm`
- Ajouter "communicante" comme valeur possible pour `room_category` dans le modèle
- Synchroniser `NewRoomPage` avec le système `room_category`/`room_subcategory`

---

## 2. CAPACITÉ

### Document fonctionnel
- Capacité standard (adultes)
- Enfant mineur accepté ? (Oui / non)
- Capacité maximale autorisée

### Implémentation actuelle

**Modèle Room** :
- `capacity` (integer) : Capacité standard
- Pas de champ pour "enfant mineur accepté"
- `max_extra_beds` (integer) : Nombre maximum de lits d'appoint

**Formulaire simple** :
- `capacity` : Champ présent

**Formulaire avancé** :
- `capacity` : Auto-rempli selon catégorie (1 pour single, 2 pour double, etc.)

### ✅ Ce qui existe
- ✅ Capacité standard : `capacity` (integer)
- ✅ Capacité maximale : `capacity` + `max_extra_beds` (implicite)

### ⚠️ Ce qui manque
- ⚠️ **Enfant mineur accepté** : Pas de champ dédié `children_allowed` (boolean)

### 🔧 Ce qui peut être ajouté
- Ajouter colonne `children_allowed` (boolean, nullable) dans table `rooms`
- Ajouter dans `$fillable` du modèle Room
- Ajouter checkbox dans les formulaires (simple et avancé)

---

## 3. COUCHAGE

### Document fonctionnel
**Type de lit** :
- 80×180 cm
- 90×180 cm
- 140×180 cm
- 160×200 cm
- 200×200 cm

**Configuration** :
- Grand lit
- Lits séparés
- Autre (champ libre court si nécessaire)

### Implémentation actuelle

**Modèle Room** :
- `bedding` (JSON) : Structure flexible pour configuration des lits
- `bedding_custom` (string) : Literie personnalisée

**Formulaire avancé** :
- Types disponibles : single_80, single_90, double_140, queen_160, king_200, twin, custom
- Stockage dans `bedding.type`

### ✅ Ce qui existe
- ✅ Dimensions lits : single_80 (80×180), single_90 (90×180), double_140 (140×180), queen_160 (160×200), king_200 (200×200)
- ✅ Configuration : twin (lits séparés), custom (autre)
- ✅ Champ personnalisé : `bedding_custom` pour précisions

### ⚠️ Ce qui manque
- ⚠️ **Structure bedding JSON** : Le champ existe mais la structure n'est pas standardisée (actuellement `{type: string}`)
- ⚠️ **Configuration explicite** : Pas de distinction claire "Grand lit" vs "Lits séparés" (seulement via type twin)

### 🔧 Ce qui peut être ajouté
- Standardiser `bedding` JSON : `{type: string, dimensions: string, configuration: 'single_bed'|'double_bed'|'twin_beds'|'other', custom?: string}`
- Ajouter champ `bed_configuration` (enum) si nécessaire, ou utiliser la structure JSON existante

---

## 4. ESPACES DE LA CHAMBRE

### Document fonctionnel
- Espace nuit (oui)
- Espace salon (oui / non)
- Coin cuisine / kitchenette (oui / non)
- Dressing ou penderie (choix)

### Implémentation actuelle

**Modèle Room** :
- `has_living_room` (boolean) : Espace salon
- `has_kitchen` (boolean) : Cuisine/kitchenette
- `kitchen_type` (string) : Type de cuisine
- `storage_options` (JSON) : Options de rangement (dressing/penderie)
- `has_dining_area` (boolean) : Espace salle à manger
- `dining_capacity` (integer) : Capacité salle à manger

**Formulaire avancé** :
- Checkbox "Espace salon"
- Checkbox "Cuisine / Kitchenette"
- Pas de champ "Espace nuit" (toujours présent selon doc)

### ✅ Ce qui existe
- ✅ Espace salon : `has_living_room` (boolean)
- ✅ Cuisine/kitchenette : `has_kitchen` (boolean) + `kitchen_type` (string)
- ✅ Rangement : `storage_options` (JSON) - peut contenir dressing/penderie

### ⚠️ Ce qui manque
- ⚠️ **Espace nuit** : Pas de champ dédié (mais toujours présent selon doc, donc optionnel)
- ⚠️ **Dressing vs Penderie** : `storage_options` est JSON, pas de choix explicite enum

### 🔧 Ce qui peut être ajouté
- Ajouter `has_bedroom` (boolean, défaut true) si nécessaire (mais redondant, toujours présent)
- Standardiser `storage_options` JSON : `{type: 'wardrobe'|'closet'|'both', details?: string}` ou ajouter champ `storage_type` (enum)

---

## 5. SALLE DE BAIN

### Document fonctionnel
(Coches multiples)
- Douche
- Baignoire
- Baignoire jacuzzi
- Double vasque
- Toilettes
- Toilettes visiteurs (si applicable)

### Implémentation actuelle

**Modèle Room** :
- `bathroom_features` (JSON) : Tableau d'équipements
- `has_guest_toilet` (boolean) : Toilettes visiteurs
- `has_additional_bathroom` (boolean) : Salle de bain supplémentaire

**Formulaire avancé** :
- Options : shower, bathtub, jacuzzi, italian_shower, double_sink
- Sélection multiple

### ✅ Ce qui existe
- ✅ Douche : `shower` dans `bathroom_features`
- ✅ Baignoire : `bathtub` dans `bathroom_features`
- ✅ Jacuzzi : `jacuzzi` dans `bathroom_features`
- ✅ Double vasque : `double_sink` dans `bathroom_features`
- ✅ Toilettes visiteurs : `has_guest_toilet` (boolean)
- ✅ Douche à l'italienne : `italian_shower` (pour PMR)

### ⚠️ Ce qui manque
- ⚠️ **Toilettes** : Pas de distinction explicite (supposées toujours présentes dans salle de bain principale)

### 🔧 Ce qui peut être ajouté
- Ajouter "toilettes" dans `bathroom_features` si nécessaire (mais redondant, toujours présentes)
- Vérifier que la structure JSON `bathroom_features` est bien un tableau de strings

---

## 6. ÉQUIPEMENTS CHAMBRE

### Document fonctionnel
(Coches)
- Climatisation : Centrale / Réglable
- Télévision
- Bureau / espace de travail
- Salon
- Mini-bar
- Réfrigérateur (appartements)
- Machine à café
- Sèche-cheveux
- Fer à repasser
- Coffre-fort

### Implémentation actuelle

**Modèle Room** :
- `basic_amenities` (JSON) : Tableau d'équipements de base
- `amenities` (JSON) : Équipements généraux (legacy)

**Formulaire avancé** :
- Options : tv, air_conditioning, wifi, desk, hairdryer, minibar, safe, coffee_machine

### ✅ Ce qui existe
- ✅ Télévision : `tv` dans `basic_amenities`
- ✅ Climatisation : `air_conditioning` dans `basic_amenities`
- ✅ Bureau : `desk` dans `basic_amenities`
- ✅ Mini-bar : `minibar` dans `basic_amenities`
- ✅ Machine à café : `coffee_machine` dans `basic_amenities`
- ✅ Sèche-cheveux : `hairdryer` dans `basic_amenities`
- ✅ Coffre-fort : `safe` dans `basic_amenities`

### ⚠️ Ce qui manque
- ⚠️ **Climatisation centrale/réglable** : Pas de distinction, seulement `air_conditioning`
- ⚠️ **Salon** : Géré via `has_living_room` (espace) mais pas dans équipements
- ⚠️ **Réfrigérateur** : Pas d'option spécifique (peut être dans `kitchen_equipment`)

### 🔧 Ce qui peut être ajouté
- Ajouter distinction climatisation : `ac_type` (enum: 'central', 'adjustable') ou dans `basic_amenities` JSON : `{air_conditioning: {type: 'central'|'adjustable'}}`
- Ajouter "refrigerator" dans `basic_amenities` ou vérifier `kitchen_equipment` JSON
- Vérifier que "salon" est bien géré via `has_living_room` (espace, pas équipement)

---

## 7. ÉQUIPEMENTS PREMIUM

### Document fonctionnel
- Peignoir
- Chaussons
- Plateau de courtoisie
- Produits d'accueil

### Implémentation actuelle

**Modèle Room** :
- `premium_amenities` (JSON) : Tableau d'équipements premium

**Formulaire avancé** :
- Options : courtesy_tray, welcome_products, bathrobe, slippers

### ✅ Ce qui existe
- ✅ Peignoir : `bathrobe` dans `premium_amenities`
- ✅ Chaussons : `slippers` dans `premium_amenities`
- ✅ Plateau de courtoisie : `courtesy_tray` dans `premium_amenities`
- ✅ Produits d'accueil : `welcome_products` dans `premium_amenities`

### ⚠️ Ce qui manque
- Aucun élément manquant

### 🔧 Ce qui peut être ajouté
- Rien à ajouter, tout est présent

---

## 8. VUE & EXTÉRIEUR

### Document fonctionnel
**Vue** :
- Jardin
- Mer
- Montagne
- Parking

**Extérieur** :
- Balcon (oui / non)
- Terrasse (oui / non)

### Implémentation actuelle

**Modèle Room** :
- `view_type` (string) : city, garden, pool, sea, mountain, parking
- `view_price_modifier` (decimal) : Modificateur de prix selon vue (-5% à +30%)
- `outdoor_features` (JSON) : Tableau d'espaces extérieurs
- `outdoor_area` (decimal) : Superficie extérieure en m²

**Formulaire avancé** :
- Types de vue : city, garden, pool, sea, mountain, parking (avec modificateurs)
- Espaces extérieurs : balcony, terrace

### ✅ Ce qui existe
- ✅ Vue Jardin : `garden` dans `view_type`
- ✅ Vue Mer : `sea` dans `view_type`
- ✅ Vue Montagne : `mountain` dans `view_type`
- ✅ Vue Parking : `parking` dans `view_type`
- ✅ Balcon : `balcony` dans `outdoor_features`
- ✅ Terrasse : `terrace` dans `outdoor_features`
- ✅ Modificateur prix : `view_price_modifier` calculé automatiquement selon vue

### ⚠️ Ce qui manque
- ⚠️ **Vue Ville** : Présente dans le code (`city`) mais pas dans le document fonctionnel
- ⚠️ **Vue Piscine** : Présente dans le code (`pool`) mais pas dans le document fonctionnel

### 🔧 Ce qui peut être ajouté
- Rien à ajouter, tout est présent (et même plus avec vue ville et piscine)

---

## 9. MÉDIAS PAR TYPE

### Document fonctionnel
- Photos uniquement
- Photos liées exclusivement à ce type de chambre
- Nommer les chambres

### Implémentation actuelle

**Modèle Room** :
- Relation `images()` : hasMany RoomImage
- Relation `primaryImage()` : hasOne RoomImage (is_primary = true)
- Méthode `hasMinimumImages($min = 3)` : Vérifie minimum 3 images

**Table `room_images`** :
- `room_id` : Lien vers chambre
- `image_path` : Chemin image
- `is_primary` : Image principale
- `sort_order` : Ordre d'affichage
- `caption` : Légende FR
- `caption_en` : Légende EN

**Formulaire** :
- Upload images après création chambre
- Minimum 3 images requis pour activation

### ✅ Ce qui existe
- ✅ Photos par chambre : Table `room_images` avec relation `room_id`
- ✅ Image principale : `is_primary` (boolean)
- ✅ Ordre d'affichage : `sort_order` (integer)
- ✅ Légendes : `caption` et `caption_en`
- ✅ Minimum 3 images : Validation `hasMinimumImages(3)`

### ⚠️ Ce qui manque
- ⚠️ **Nommer les chambres** : Le champ `name` existe dans `rooms`, mais pas de système de nommage individuel des chambres (seulement le type)
- ⚠️ **Nommage images** : Les images ont des légendes (`caption`) mais pas de "nom" dédié

### 🔧 Ce qui peut être ajouté
- Utiliser `caption` existant pour "nommer" les images (déjà présent)
- Vérifier que le champ `name` de `rooms` permet bien de nommer individuellement chaque chambre (pas seulement le type)

---

## 10. PETIT DÉJEUNER (Document fonctionnel - Étape 6)

### Document fonctionnel
- Petit déjeuner inclus (oui / non)
- Si oui pour combien de personne
- Si c'est pour une seule personne, le coût du deuxième

### Implémentation actuelle

**Modèle Room** :
- Pas de champ dédié au niveau chambre
- `breakfast_included` existe au niveau `accommodations` (établissement)

**Formulaire** :
- Pas de champ dans les formulaires de chambre

### ✅ Ce qui existe
- ✅ Petit déjeuner inclus : Au niveau établissement (`accommodations.breakfast_included`)

### ⚠️ Ce qui manque
- ⚠️ **Petit déjeuner par chambre** : Pas de champ `breakfast_included` au niveau `rooms`
- ⚠️ **Nombre personnes petit déj** : Pas de champ `breakfast_included_persons` au niveau `rooms`
- ⚠️ **Coût deuxième personne** : Pas de champ `breakfast_second_person_price` au niveau `rooms`

### 🔧 Ce qui peut être ajouté
- Ajouter colonnes dans `rooms` :
  - `breakfast_included` (boolean, nullable)
  - `breakfast_included_persons` (integer, nullable)
  - `breakfast_second_person_price` (decimal, nullable)
- Ajouter dans `$fillable` du modèle Room
- Ajouter champs dans les formulaires

---

## 11. TARIFICATION (Document fonctionnel - Étape 6)

### Document fonctionnel
- Prix par nuit
- Petit-déjeuner : Inclus pour 1 personne, Supplément personne additionnelle (montant)
- Capacité maximale autorisée

### Implémentation actuelle

**Modèle Room** :
- `price_per_night` (decimal) : Prix par nuit
- `single_occupancy_price` (decimal) : Prix occupation simple (-15% par défaut)
- `extra_bed_price` (decimal) : Prix lit d'appoint
- `max_extra_beds` (integer) : Nombre max lits d'appoint
- `capacity` (integer) : Capacité maximale
- `view_price_modifier` (decimal) : Modificateur selon vue

**Formulaire avancé** :
- Prix de base
- Prix occupation simple
- Calcul automatique avec modificateur vue

### ✅ Ce qui existe
- ✅ Prix par nuit : `price_per_night`
- ✅ Capacité maximale : `capacity`
- ✅ Prix occupation simple : `single_occupancy_price`
- ✅ Supplément lit d'appoint : `extra_bed_price`

### ⚠️ Ce qui manque
- ⚠️ **Supplément personne additionnelle petit déj** : Pas de champ dédié (voir section 10)

### 🔧 Ce qui peut être ajouté
- Ajouter `breakfast_extra_person_price` (decimal) si différent de `breakfast_second_person_price`

---

## RÉSUMÉ PAR STATUT

### ✅ Complètement géré (9 sections)
1. Types de chambres (sauf communicante)
2. Capacité (sauf enfants acceptés)
3. Couchage (structure à standardiser)
4. Espaces (sauf espace nuit explicite)
5. Salle de bain
6. Équipements standards (sauf distinction AC)
7. Équipements premium
8. Vue & extérieur
9. Médias par type

### ⚠️ Partiellement géré (2 sections)
1. **Petit déjeuner** : Existe au niveau établissement, manque au niveau chambre
2. **Tarification** : Manque supplément petit déj personne additionnelle

### ❌ Manquant (1 élément)
1. **Chambre communicante** : Type absent des options

---

## ÉLÉMENTS POUVANT ÊTRE AJOUTÉS SANS CASSER L'EXISTANT

### Ajouts simples (colonnes nullable)
1. `children_allowed` (boolean, nullable) : Enfant mineur accepté
2. `breakfast_included` (boolean, nullable) : Petit déj inclus par chambre
3. `breakfast_included_persons` (integer, nullable) : Nombre personnes petit déj
4. `breakfast_second_person_price` (decimal, nullable) : Coût deuxième personne
5. `breakfast_extra_person_price` (decimal, nullable) : Supplément personne additionnelle
6. `ac_type` (enum: 'central', 'adjustable', nullable) : Type climatisation
7. `storage_type` (enum: 'wardrobe', 'closet', 'both', nullable) : Type rangement

### Ajouts avec standardisation JSON
1. Standardiser `bedding` JSON : `{type, dimensions, configuration, custom?}`
2. Standardiser `storage_options` JSON : `{type, details?}`
3. Standardiser `basic_amenities` pour AC : `{air_conditioning: {type: 'central'|'adjustable'}}`

### Ajouts d'options
1. Ajouter "communicante" dans `room_category` enum
2. Ajouter "communicante" dans `CATEGORIES` de `EnhancedRoomForm`

---

## COMPATIBILITÉ AVEC L'EXISTANT

### ✅ Compatible
- Tous les ajouts proposés utilisent des colonnes nullable ou des extensions JSON
- Aucun renommage ou suppression de champs existants
- Les formulaires peuvent être étendus sans casser les données existantes

### ⚠️ Attention
- Standardiser les JSON existants peut nécessiter une migration de données
- Synchroniser `NewRoomPage` avec `room_category`/`room_subcategory` peut affecter les chambres créées avec l'ancien formulaire

---

**Note** : Cette analyse identifie uniquement les écarts. Aucune solution technique n'est proposée, conformément aux règles impératives.
