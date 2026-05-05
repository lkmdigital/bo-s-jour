# 📋 Comparaison : Document Fonctionnel vs Implémentation Actuelle

**Date** : 2026-01-22  
**Document de référence** : LES ETAPES D'ENREGISTREMENT DES ETABLISSEMENTS.docx

---

## Structure de comparaison

Pour chaque étape du document fonctionnel :
- ✅ **Champs existants** : Présents dans le wizard ET dans la base de données
- ⚠️ **Champs partiellement couverts** : Présents en base mais pas dans le wizard, ou inversement
- ❌ **Champs manquants** : Absents du wizard ET/OU de la base de données

---

## ÉTAPE 1 : TYPE D'HÉBERGEMENT

### Document fonctionnel
**Choix unique obligatoire** :
- Hôtel
- Appart-hôtel
- Ecolodge
- Appart-résidence
- Maison d'hôtes
- Studio
- La suite du formulaire dépend de ce choix.

### Implémentation actuelle
**Options disponibles** (lignes 61-66) :
- `hotel` → Hôtel ✅
- `lodge` → Lodge ⚠️ (pas "Ecolodge" spécifiquement)
- `guesthouse` → Maison d'hôtes ✅
- `apartment` → Appartement ⚠️ (pas "Appart-hôtel" ni "Appart-résidence" ni "Studio")

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Appart-hôtel** | Type d'hébergement spécifique | Nécessite ajout de `apartment_hotel` dans enum `type` de `accommodations` |
| **Ecolodge** | Type d'hébergement spécifique | Nécessite ajout de `ecolodge` dans enum `type` ou remplacement de `lodge` |
| **Appart-résidence** | Type d'hébergement spécifique | Nécessite ajout de `apartment_residence` dans enum `type` |
| **Studio** | Type d'hébergement spécifique | Nécessite ajout de `studio` dans enum `type` |
| **Logique conditionnelle** | La suite du formulaire dépend du choix | Nécessite logique conditionnelle pour afficher/masquer des champs selon le type |

---

## ÉTAPE 2 : LOCALISATION

### Document fonctionnel
- Ville
- Quartier
- Adresse libre
- Géolocalisation : Latitude, Longitude

### Implémentation actuelle
**Champs présents** (lignes 832-985) :
- `city` → Ville ✅
- `address` → Adresse libre ✅
- `latitude` → Latitude ✅
- `longitude` → Longitude ✅

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Quartier** | Quartier ou zone précise dans la ville | Nécessite colonne `district` ou `neighborhood` dans `accommodations` |

---

## ÉTAPE 3 : INFORMATIONS GÉNÉRALES HÉBERGEMENT

### Document fonctionnel
- Nom de l'établissement
- Année d'ouverture
- Classification :
  - Standing
  - Étoiles (si applicable)
  - Non classé
- Nombre total de chambres
- Nombre d'étages (optionnel)

### Implémentation actuelle
**Champs présents** (lignes 988-1164) :
- `name` → Nom de l'établissement ✅
- `opening_year` → Année d'ouverture ✅
- `star_rating` → Étoiles (1-5) ✅
- `bedrooms` → Nombre total de chambres ✅
- `star_rating` peut être null → "Non classé" ✅

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Standing** | Classification par standing (luxe, standard, économique) | Nécessite colonne `standing` (enum) dans `accommodations` |
| **Nombre d'étages** | Nombre d'étages de l'établissement | Nécessite colonne `floors_count` (integer) dans `accommodations` |

---

## ÉTAPE 4 : SERVICES DE L'ÉTABLISSEMENT

### Document fonctionnel
(Coches uniquement)
- Restaurant (oui / non)
- Capacité assise
- Bar (oui / non)
- Piscine (oui / non)
- Salle de conférence (oui / non)
  - Nombre
  - Capacité en mode cinéma
- Espaces loisirs :
  - Sport
  - Jeux
  - Cigare
  - Autres (à saisir)

### Implémentation actuelle
**Champs présents** (lignes 1262-1372) :
- `restaurant_capacity` → Capacité restaurant ✅ (mais pas de checkbox "Restaurant oui/non")
- `bar_capacity` → Capacité bar ✅ (mais pas de checkbox "Bar oui/non")
- `conference_rooms_count` → Nombre de salles ✅
- `conference_capacity` → Capacité totale ✅
- Piscine dans `amenities` (JSON) ✅

### ⚠️ Champs partiellement couverts

| Champ | Statut | Description |
|-------|--------|-------------|
| Restaurant | ⚠️ Capacité présente mais pas de checkbox | Capacité saisie mais pas de checkbox "Restaurant oui/non" |
| Bar | ⚠️ Capacité présente mais pas de checkbox | Capacité saisie mais pas de checkbox "Bar oui/non" |
| Piscine | ⚠️ Dans amenities mais pas dédié | Présent dans liste `amenities` mais pas de champ dédié boolean |

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Checkbox Restaurant** | Case à cocher "Restaurant oui/non" | Nécessite colonne `has_restaurant` (boolean) dans `accommodations` |
| **Checkbox Bar** | Case à cocher "Bar oui/non" | Nécessite colonne `has_bar` (boolean) dans `accommodations` |
| **Checkbox Piscine** | Case à cocher "Piscine oui/non" | Nécessite colonne `has_pool` (boolean) dans `accommodations` |
| **Checkbox Salle de conférence** | Case à cocher "Salle de conférence oui/non" | Nécessite colonne `has_conference_room` (boolean) dans `accommodations` |
| **Capacité en mode cinéma** | Capacité spécifique en mode cinéma | Nécessite colonne `conference_cinema_capacity` (integer) dans `accommodations` |
| **Espaces loisirs structurés** | Sport, Jeux, Cigare, Autres | Nécessite colonne `leisure_spaces` (JSON) dans `accommodations` avec structure : `{sport: boolean, games: boolean, cigar: boolean, other: string}` |

---

## ÉTAPE 5 : CONFIGURATION DES CHAMBRES

### Document fonctionnel
**Types disponibles** :
- Single
- Double
- Twin
- Chambre communicante
- Suite
- Studio
- Appartement
- Villa

**Pour chaque type de chambre, les mêmes sous-sections s'appliquent** :

#### Informations générales par type
- Nom interne du type (ex. Double standard, Suite junior)
- Capacité standard (adultes)
- Enfant mineur accepté ? (Oui / non)
- Petit déjeuner inclus (oui / non), si oui pour combien de personne. Si c'est pour une seule personne, le coût du deuxième.
- Couchage
  - Type de lit :
    - 80x180
    - 90x180
    - 140x180
    - 160x200
    - 200x200
  - Configuration :
    - Grand lit
    - Lits séparés
    - Autre (champ libre court si nécessaire)

#### Espaces de la chambre
- Espace nuit (oui)
- Espace salon (oui / non)
- Coin cuisine / kitchenette (oui / non)
- Dressing ou penderie (choix)

#### Salle de bain
(Coches multiples)
- Douche
- Baignoire
- Baignoire jacuzzi
- Double vasque
- Toilettes
- Toilettes visiteurs (si applicable)

#### Équipements chambre
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

#### Équipements premium
- Peignoir
- Chaussons
- Plateau de courtoisie
- Produits d'accueil

#### Vue & extérieur
- Vue : Jardin / Mer / Montagne / Parking
- Balcon (oui / non)
- Terrasse (oui / non)

#### Médias par type
- Photos uniquement
- Photos liées exclusivement à ce type de chambre
- Nommer les chambres.

### Implémentation actuelle

**Types disponibles** (lignes 89-98) :
- Chambre simple ✅ (équivalent Single)
- Chambre double ✅ (équivalent Double)
- Chambre triple ⚠️ (pas dans document fonctionnel)
- Suite ✅
- Appartement ✅
- Villa ✅
- Bungalow ⚠️ (pas dans document fonctionnel)
- Chalet ⚠️ (pas dans document fonctionnel)

**Types manquants** :
- Twin ❌
- Chambre communicante ❌
- Studio ❌

**Configuration actuelle** :
- Les chambres sont créées **APRÈS** l'établissement, via une interface séparée (`/dashboard/host/accommodations/{id}/rooms/new`)
- Le wizard actuel permet seulement de sélectionner des types et de définir des tarifs par type (lignes 1201-1258)
- Pas de configuration détaillée dans le wizard

**Champs Room existants** (d'après `Room.php`) :
- `name`, `name_en` → Nom interne ✅
- `capacity` → Capacité standard ✅
- `bedrooms`, `bathrooms` ✅
- `price_per_night` ✅
- `amenities` (JSON) ✅
- `has_living_room` → Espace salon ✅
- `has_kitchen` → Coin cuisine ✅
- `storage_options` → Dressing/penderie ✅
- `bathroom_features` (JSON) → Salle de bain ✅
- `has_guest_toilet` → Toilettes visiteurs ✅
- `basic_amenities` (JSON) → Équipements chambre ✅
- `premium_amenities` (JSON) → Équipements premium ✅
- `view_type` → Vue ✅
- `outdoor_features` (JSON) → Balcon/Terrasse ✅
- `bedding` (JSON) → Couchage ✅

### ⚠️ Champs partiellement couverts

| Champ | Statut | Description |
|-------|--------|-------------|
| **Configuration chambres dans wizard** | ⚠️ Pas dans wizard | Les chambres sont configurées après création, pas pendant le wizard |
| **Types de chambres** | ⚠️ Partiellement | Twin, Chambre communicante, Studio manquants |
| **Enfant mineur accepté** | ⚠️ Non visible | Pas de champ dédié visible dans le code |
| **Petit déjeuner inclus par type** | ⚠️ Au niveau établissement | `breakfast_included` existe au niveau `accommodations`, pas par type de chambre |
| **Coût deuxième personne petit déj** | ❌ Absent | Pas de champ pour le coût du deuxième petit déjeuner |
| **Type de lit (dimensions)** | ⚠️ Partiellement | `bedding` existe mais pas de dimensions spécifiques (80x180, etc.) |
| **Configuration lit (grand lit/lits séparés)** | ⚠️ Partiellement | `bedding` existe mais pas de structure claire |
| **Climatisation (centrale/réglable)** | ⚠️ Partiellement | Présent dans `basic_amenities` mais pas de distinction centrale/réglable |
| **Photos par type** | ⚠️ Partiellement | Photos chambres existent mais pas de lien direct type ↔ photos dans wizard |

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Configuration chambres dans wizard** | Configuration détaillée des chambres pendant le wizard (pas après) | Nécessite intégration de la configuration chambres dans le wizard (étape 5) |
| **Type Twin** | Type de chambre Twin | Nécessite ajout dans `roomTypeOptions` |
| **Type Chambre communicante** | Type de chambre communicante | Nécessite ajout dans `roomTypeOptions` |
| **Type Studio** | Type de chambre Studio | Nécessite ajout dans `roomTypeOptions` |
| **Enfant mineur accepté** | Checkbox "Enfant mineur accepté ?" par type | Nécessite colonne `children_allowed` (boolean) dans `rooms` |
| **Petit déjeuner inclus par type** | Petit déjeuner inclus spécifique à chaque type de chambre | Nécessite colonne `breakfast_included` (boolean) dans `rooms` |
| **Nombre personnes petit déj inclus** | Nombre de personnes pour petit déj inclus par type | Nécessite colonne `breakfast_included_persons` (integer) dans `rooms` |
| **Coût deuxième personne petit déj** | Coût du deuxième petit déjeuner si inclus pour 1 personne | Nécessite colonne `breakfast_second_person_price` (decimal) dans `rooms` |
| **Dimensions lits** | Dimensions précises des lits (80x180, 90x180, etc.) | Nécessite structure dans `bedding` JSON : `{type: string, dimensions: string, configuration: string}` |
| **Configuration lit** | Grand lit / Lits séparés / Autre | Nécessite champ `bed_configuration` (enum) dans `rooms` |
| **Climatisation centrale/réglable** | Distinction entre climatisation centrale et réglable | Nécessite champ `ac_type` (enum: central, adjustable) dans `rooms` ou dans `basic_amenities` JSON |
| **Espace nuit** | Checkbox "Espace nuit" (toujours oui selon doc) | Nécessite colonne `has_bedroom` (boolean, défaut true) dans `rooms` |
| **Dressing vs Penderie** | Choix entre Dressing ou Penderie | Nécessite champ `storage_type` (enum: wardrobe, closet) dans `rooms` |
| **Baignoire jacuzzi** | Distinction baignoire normale vs jacuzzi | Nécessite structure dans `bathroom_features` JSON pour distinguer |
| **Double vasque** | Double vasque dans salle de bain | Nécessite structure dans `bathroom_features` JSON |
| **Vue Parking** | Vue sur parking (option dans document) | Nécessite ajout "Parking" dans enum `view_type` |
| **Nommer les chambres** | Nommer individuellement chaque chambre (pas seulement le type) | Nécessite création de chambres individuelles avec noms uniques, pas seulement types |

---

## ÉTAPE 6 : TARIFICATION

### Document fonctionnel
**Par type de chambre** :
- Prix par nuit
- Petit-déjeuner :
  - Inclus pour 1 personne
  - Supplément personne additionnelle (montant)
- Capacité maximale autorisée

### Implémentation actuelle
**Champs présents** (lignes 1168-1258) :
- `price_per_night` par type → Prix par nuit ✅
- `breakfast_included` au niveau établissement ⚠️ (pas par type)
- `breakfast_included_persons` au niveau établissement ⚠️ (pas par type)
- `capacity` dans Room → Capacité maximale ✅

### ⚠️ Champs partiellement couverts

| Champ | Statut | Description |
|-------|--------|-------------|
| **Petit déjeuner par type** | ⚠️ Au niveau établissement | `breakfast_included` existe au niveau `accommodations`, pas par type de chambre |
| **Supplément personne additionnelle** | ⚠️ Partiellement | `extra_bed_price` existe dans `rooms` mais pas spécifiquement pour petit déj |

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Petit déjeuner inclus par type** | Petit déjeuner inclus spécifique à chaque type de chambre | Nécessite colonne `breakfast_included` (boolean) dans `rooms` |
| **Nombre personnes petit déj inclus par type** | Nombre de personnes pour petit déj inclus par type | Nécessite colonne `breakfast_included_persons` (integer) dans `rooms` |
| **Supplément personne additionnelle petit déj** | Montant du supplément pour personne additionnelle au petit déjeuner | Nécessite colonne `breakfast_extra_person_price` (decimal) dans `rooms` |

---

## ÉTAPE 7 : POLITIQUES

### Document fonctionnel
- Politique d'annulation :
  - Flexible
  - Modérée
  - Stricte
- Moyens de paiement acceptés :
  - Espèces
  - Mobile Money
  - Carte bancaire
  - Virement

### Implémentation actuelle
**Champs présents** (lignes 1374-1518) :
- `cancellation_policy_hours` (integer, défaut 48) ⚠️ (pas de choix Flexible/Modérée/Stricte)
- `payment_methods` (JSON) ✅
  - Mobile Money ✅
  - Carte bancaire ✅
  - Espèces ✅
  - Virement bancaire ✅

### ⚠️ Champs partiellement couverts

| Champ | Statut | Description |
|-------|--------|-------------|
| **Politique d'annulation** | ⚠️ Heures au lieu de types | `cancellation_policy_hours` existe mais pas de choix Flexible/Modérée/Stricte |

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Politique d'annulation par type** | Choix entre Flexible, Modérée, Stricte | Nécessite colonne `cancellation_policy_type` (enum: flexible, moderate, strict) dans `accommodations` ou `rooms` |
| **Mapping heures ↔ type** | Correspondance entre heures et type (ex: Flexible = 7j, Modérée = 48h, Stricte = 24h) | Nécessite logique de mapping ou remplacement de `cancellation_policy_hours` par `cancellation_policy_type` |

---

## ÉTAPE 8 : MÉDIAS GÉNÉRAUX

### Document fonctionnel
- Façade
- Espaces communs
- Restaurant / piscine (si existants)
- Nommer les images.

### Implémentation actuelle
**Champs présents** (lignes 1521-1598) :
- Upload médias (images/vidéos) ✅
- Minimum 6 photos requis ✅
- Maximum 10 fichiers ✅
- `is_primary` → Image principale ✅
- `order` → Ordre d'affichage ✅

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Catégorie médias** | Catégorisation : Façade, Espaces communs, Restaurant, Piscine | Nécessite colonne `category` (enum) dans `accommodation_images` : `facade`, `common_areas`, `restaurant`, `pool` |
| **Nommer les images** | Nom/titre pour chaque image | Nécessite colonne `title` ou `name` (string) dans `accommodation_images` |
| **Condition Restaurant/Piscine** | Afficher catégorie Restaurant/Piscine seulement si ces services existent | Nécessite logique conditionnelle basée sur `has_restaurant` et `has_pool` |

---

## ÉTAPE 9 : VALIDATION

### Document fonctionnel
- Récapitulatif complet
- Engagement sur l'exactitude des informations
- Soumission pour validation interne

### Implémentation actuelle
**Fonctionnalités présentes** :
- Soumission → `status = 'pending'` ✅
- Workflow d'approbation admin existe ✅

### ❌ Éléments manquants

| Élément manquant | Description fonctionnelle | Dépendances éventuelles |
|------------------|---------------------------|-------------------------|
| **Récapitulatif complet** | Page de récapitulatif avant soumission | Nécessite création d'une étape de récapitulatif dans le wizard |
| **Engagement exactitude** | Checkbox d'engagement sur l'exactitude des informations | Nécessite ajout d'une checkbox avec validation obligatoire |
| **Validation étape par étape** | Rendre obligatoire le remplissage d'une étape avant de passer à la suivante | Nécessite validation côté frontend et backend pour chaque étape |

---

## RÉSUMÉ GÉNÉRAL

### ✅ Champs existants : **~30 champs**
La plupart des champs de base sont présents.

### ⚠️ Champs partiellement couverts : **~15 champs**
- Configuration chambres : Existe mais pas dans le wizard (après création)
- Types de chambres : Partiellement (Twin, Communicante, Studio manquants)
- Services : Capacités présentes mais pas de checkboxes
- Politiques : Heures au lieu de types (Flexible/Modérée/Stricte)

### ❌ Champs manquants : **~40 champs**
Répartis en :
- **Types d'hébergement** : 4 types manquants (Appart-hôtel, Ecolodge, Appart-résidence, Studio)
- **Localisation** : 1 champ (Quartier)
- **Établissement** : 2 champs (Standing, Nombre d'étages)
- **Services** : 6 champs (checkboxes + capacités spécifiques)
- **Configuration chambres** : 15+ champs (intégration dans wizard + détails)
- **Tarification** : 3 champs (petit déj par type)
- **Politiques** : 1 champ (type d'annulation)
- **Médias** : 2 champs (catégorie, nom)
- **Validation** : 3 fonctionnalités (récapitulatif, engagement, validation étape)

---

## DÉPENDANCES IDENTIFIÉES

### Dépendances structurelles majeures
1. **Configuration chambres dans wizard** : Actuellement, les chambres sont créées après l'établissement. Le document fonctionnel demande la configuration pendant le wizard (étape 5).
2. **Types d'hébergement** : Enum `type` doit être étendu pour inclure Appart-hôtel, Ecolodge, Appart-résidence, Studio.
3. **Logique conditionnelle** : La suite du formulaire doit dépendre du type d'hébergement choisi.

### Dépendances fonctionnelles
1. **Validation étape par étape** : Chaque étape doit être validée avant de passer à la suivante.
2. **Catégorisation médias** : Les médias doivent être catégorisés (Façade, Espaces communs, etc.).
3. **Politique d'annulation** : Passage de heures (integer) à type (enum: Flexible/Modérée/Stricte).

---

## NOTES IMPORTANTES

1. **Configuration chambres** : Le document fonctionnel demande la configuration détaillée des chambres **pendant le wizard** (étape 5), alors que l'implémentation actuelle les crée **après** la création de l'établissement. C'est un changement structurel majeur.

2. **Validation obligatoire** : Le document précise "rendre obligatoire le remplissage d'une étape avant de passer à la prochaine étape". Actuellement, seule la validation finale existe.

3. **Nommer les chambres** : Le document demande de "nommer les chambres" individuellement, pas seulement les types. Cela implique la création de chambres individuelles avec noms uniques.

4. **Médias par type** : Le document demande des "photos liées exclusivement à ce type de chambre" et de "nommer les chambres". Cela implique un système de médias liés aux chambres individuelles, pas seulement aux types.
