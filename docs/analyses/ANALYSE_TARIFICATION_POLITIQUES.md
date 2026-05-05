# 📊 Analyse : Modules de tarification et politiques

**Date** : 2026-01-22  
**Objectif** : Analyser les modules existants et identifier les champs manquants selon le document fonctionnel  
**Règle** : Ajouter UNIQUEMENT les champs explicitement demandés, sans anticipation

---

## Structure de comparaison

Pour chaque élément du document fonctionnel :
- ✅ **Existe** : Présent dans le code et fonctionnel
- ⚠️ **Partiellement** : Présent mais incomplet ou au mauvais niveau
- ❌ **Manquant** : Absent du code actuel

---

## 1. PRIX PAR NUIT

### Document fonctionnel (Étape 6)
**Par type de chambre** :
- Prix par nuit

### Implémentation actuelle

**Table `rooms`** :
- `price_per_night` (decimal 10,2) : ✅ Présent

**Table `accommodations`** :
- `price_per_night` (decimal 10,2) : ✅ Présent (prix de base établissement)
- `room_type_pricing` (JSON) : ✅ Présent (tarifs par type de chambre au niveau établissement)

**Modèle Room** :
- `price_per_night` dans `$fillable` ✅
- Cast `decimal:2` ✅
- Méthode `getAdjustedPriceAttribute()` : Calcul prix avec modificateur vue ✅

**Modèle Accommodation** :
- `price_per_night` dans `$fillable` ✅
- `room_type_pricing` dans `$fillable` (JSON) ✅

**Formulaire** :
- `NewRoomPage` : Champ `price_per_night` présent ✅
- `EnhancedRoomForm` : Champ `price_per_night` présent ✅
- `AccommodationCreationWizard` : Champ `price_per_night` + `room_type_pricing` présents ✅

### ✅ Statut : COMPLÈTEMENT GÉRÉ
- Prix par nuit existe au niveau chambre (`rooms.price_per_night`)
- Prix par nuit existe au niveau établissement (`accommodations.price_per_night`)
- Tarifs par type de chambre existent (`accommodations.room_type_pricing`)

---

## 2. GESTION DU PETIT-DÉJEUNER

### Document fonctionnel (Étape 6)
**Par type de chambre** :
- Petit-déjeuner :
  - Inclus pour 1 personne
  - Supplément personne additionnelle (montant)

### Implémentation actuelle

**Table `accommodations`** :
- `breakfast_price` (decimal 10,2, nullable) : ✅ Tarif petit déjeuner
- `breakfast_included` (boolean, défaut false) : ✅ Petit déjeuner inclus
- `breakfast_included_persons` (integer, défaut 0) : ✅ Nombre de personnes pour petit déj inclus

**Table `rooms`** :
- ❌ Pas de champ `breakfast_included`
- ❌ Pas de champ `breakfast_included_persons`
- ❌ Pas de champ `breakfast_second_person_price`
- ❌ Pas de champ `breakfast_extra_person_price`

**Modèle Accommodation** :
- `breakfast_price`, `breakfast_included`, `breakfast_included_persons` dans `$fillable` ✅

**Modèle Room** :
- ❌ Aucun champ petit déjeuner dans `$fillable`

**Formulaire établissement** :
- `AccommodationCreationWizard` : Checkbox `breakfast_included` + radio `breakfast_included_persons` (1 ou 2) ✅

**Formulaire chambre** :
- `NewRoomPage` : ❌ Pas de champ petit déjeuner
- `EnhancedRoomForm` : ❌ Pas de champ petit déjeuner

### ⚠️ Statut : PARTIELLEMENT GÉRÉ
- ✅ Existe au niveau établissement (`accommodations`)
- ❌ Manque au niveau chambre (`rooms`)
- ❌ Manque "Supplément personne additionnelle" au niveau chambre

### 🔧 Ce qui peut être ajouté (sans casser l'existant)

**Colonnes à ajouter dans `rooms`** :
1. `breakfast_included` (boolean, nullable) : Petit déjeuner inclus
2. `breakfast_included_persons` (integer, nullable) : Nombre de personnes (1 ou 2)
3. `breakfast_second_person_price` (decimal 10,2, nullable) : Coût du deuxième petit déjeuner si inclus pour 1 personne
4. `breakfast_extra_person_price` (decimal 10,2, nullable) : Supplément personne additionnelle

**Modifications nécessaires** :
- Ajouter dans `$fillable` du modèle Room
- Ajouter dans les casts du modèle Room
- Ajouter validation dans `RoomController::store()` et `update()`
- Ajouter champs dans les formulaires de chambre

---

## 3. CAPACITÉ MAXIMALE AUTORISÉE

### Document fonctionnel (Étape 6)
**Par type de chambre** :
- Capacité maximale autorisée

### Implémentation actuelle

**Table `rooms`** :
- `capacity` (integer) : ✅ Capacité standard (adultes)
- `max_extra_beds` (integer, nullable) : ✅ Nombre maximum de lits d'appoint

**Table `accommodations`** :
- `max_guests` (integer) : ✅ Capacité maximale établissement

**Modèle Room** :
- `capacity` dans `$fillable` ✅
- `max_extra_beds` dans `$fillable` ✅

**Formulaire** :
- `NewRoomPage` : Champ `capacity` présent ✅
- `EnhancedRoomForm` : `capacity` auto-rempli selon catégorie ✅

### ✅ Statut : COMPLÈTEMENT GÉRÉ
- Capacité maximale existe au niveau chambre (`rooms.capacity`)
- Capacité maximale existe au niveau établissement (`accommodations.max_guests`)
- Lits d'appoint gérés via `max_extra_beds`

---

## 4. POLITIQUES D'ANNULATION

### Document fonctionnel (Étape 7)
- Politique d'annulation :
  - Flexible
  - Modérée
  - Stricte

### Implémentation actuelle

**Table `accommodations`** :
- `cancellation_policy_hours` (integer, défaut 48) : ⚠️ Heures en integer, pas de type Flexible/Modérée/Stricte

**Table `rooms`** :
- ❌ Pas de champ `cancellation_policy_type`
- ❌ Pas de champ `cancellation_policy_hours`

**Modèle Accommodation** :
- `cancellation_policy_hours` dans `$fillable` ✅

**Modèle Room** :
- ❌ Aucun champ politique d'annulation

**Formulaire établissement** :
- `AccommodationCreationWizard` : Message informatif "48 heures par défaut" ⚠️ (pas de saisie)

**Formulaire chambre** :
- ❌ Pas de champ politique d'annulation

### ⚠️ Statut : PARTIELLEMENT GÉRÉ
- ✅ Heures d'annulation existent au niveau établissement (`cancellation_policy_hours`)
- ❌ Type d'annulation (Flexible/Modérée/Stricte) n'existe pas
- ❌ Politique d'annulation n'existe pas au niveau chambre

### 🔧 Ce qui peut être ajouté (sans casser l'existant)

**Option 1 : Ajouter type au niveau établissement uniquement**
- Colonne `cancellation_policy_type` (enum: 'flexible', 'moderate', 'strict', nullable) dans `accommodations`
- Garder `cancellation_policy_hours` pour compatibilité
- Mapping suggéré : Flexible = 7 jours (168h), Modérée = 48h, Stricte = 24h

**Option 2 : Ajouter type au niveau chambre également**
- Colonne `cancellation_policy_type` (enum: 'flexible', 'moderate', 'strict', nullable) dans `rooms`
- Permet politique différente par type de chambre

**Modifications nécessaires** :
- Ajouter colonne dans table(s)
- Ajouter dans `$fillable` du modèle
- Ajouter validation dans contrôleur
- Ajouter sélection dans formulaire (remplacer message informatif)

---

## 5. MOYENS DE PAIEMENT ACCEPTÉS

### Document fonctionnel (Étape 7)
- Moyens de paiement acceptés :
  - Espèces
  - Mobile Money
  - Carte bancaire
  - Virement

### Implémentation actuelle

**Table `accommodations`** :
- `payment_methods` (JSON, nullable) : ✅ Tableau de moyens de paiement

**Table `rooms`** :
- ❌ Pas de champ `payment_methods`

**Modèle Accommodation** :
- `payment_methods` dans `$fillable` ✅
- Cast `array` ✅

**Modèle Room** :
- ❌ Pas de champ `payment_methods`

**Formulaire établissement** :
- `AccommodationCreationWizard` : Message informatif listant les moyens ⚠️ (pas de saisie réelle)

**Formulaire chambre** :
- ❌ Pas de champ moyens de paiement

**Options disponibles** (dans code frontend) :
- `paymentMethodOptions` : ['Mobile Money', 'Carte bancaire', 'Espèces', 'Virement bancaire'] ✅

### ⚠️ Statut : PARTIELLEMENT GÉRÉ
- ✅ Champ JSON existe au niveau établissement (`accommodations.payment_methods`)
- ⚠️ Pas de saisie dans le formulaire (message informatif uniquement)
- ❌ Pas de champ au niveau chambre (si nécessaire)

### 🔧 Ce qui peut être ajouté (sans casser l'existant)

**Option 1 : Activer la saisie au niveau établissement**
- Remplacer message informatif par checkboxes dans `AccommodationCreationWizard`
- Utiliser les options existantes : Mobile Money, Carte bancaire, Espèces, Virement bancaire

**Option 2 : Ajouter au niveau chambre (si nécessaire)**
- Colonne `payment_methods` (JSON, nullable) dans `rooms`
- Permet moyens de paiement différents par type de chambre

**Modifications nécessaires** :
- Remplacer message informatif par checkboxes dans formulaire établissement
- Ajouter validation dans `AccommodationController`
- (Optionnel) Ajouter colonne et champs dans formulaire chambre

---

## RÉSUMÉ DES CHAMPS À AJOUTER

### Niveau `rooms` (chambres)

| Champ | Type | Description | Dépendances |
|-------|------|-------------|-------------|
| `breakfast_included` | boolean, nullable | Petit déjeuner inclus | Aucune |
| `breakfast_included_persons` | integer, nullable | Nombre personnes (1 ou 2) | `breakfast_included = true` |
| `breakfast_second_person_price` | decimal(10,2), nullable | Coût 2ème personne si inclus pour 1 | `breakfast_included = true` et `breakfast_included_persons = 1` |
| `breakfast_extra_person_price` | decimal(10,2), nullable | Supplément personne additionnelle | `breakfast_included = true` |
| `cancellation_policy_type` | enum('flexible','moderate','strict'), nullable | Type politique annulation | Optionnel (peut rester au niveau établissement) |

### Niveau `accommodations` (établissement)

| Champ | Type | Description | Dépendances |
|-------|------|-------------|-------------|
| `cancellation_policy_type` | enum('flexible','moderate','strict'), nullable | Type politique annulation | Remplacer ou compléter `cancellation_policy_hours` |

### Modifications formulaires

| Formulaire | Modification | Description |
|------------|-------------|-------------|
| `NewRoomPage` | Ajouter section petit déjeuner | Checkbox + nombre personnes + suppléments |
| `EnhancedRoomForm` | Ajouter étape petit déjeuner | Intégrer dans le wizard |
| `AccommodationCreationWizard` | Remplacer message politique annulation | Sélection Flexible/Modérée/Stricte |
| `AccommodationCreationWizard` | Remplacer message moyens paiement | Checkboxes pour sélection |

---

## COMPATIBILITÉ AVEC L'EXISTANT

### ✅ Compatible
- Tous les ajouts proposés utilisent des colonnes nullable
- Aucun renommage ou suppression de champs existants
- Les données existantes restent valides (nullable = pas de valeur par défaut requise)

### ⚠️ Attention
- `cancellation_policy_type` peut coexister avec `cancellation_policy_hours` (les deux nullable)
- Ou remplacer `cancellation_policy_hours` par mapping automatique selon type
- Les formulaires peuvent être étendus sans casser les données existantes

---

## ÉLÉMENTS EXCLUS (selon règles)

### ❌ Ne pas ajouter
- Commission (mentionnée dans code mais pas dans document fonctionnel Étape 6/7)
- Calcul financier avancé
- Logique "à terme"
- Solde net
- Toute anticipation future

---

## PRIORITÉ D'IMPLÉMENTATION

### 🔴 Priorité haute (exigences document fonctionnel)
1. **Petit déjeuner par chambre** : `breakfast_included`, `breakfast_included_persons`, `breakfast_second_person_price`, `breakfast_extra_person_price` dans `rooms`
2. **Politique d'annulation par type** : `cancellation_policy_type` (enum) dans `accommodations` ou `rooms`

### 🟡 Priorité moyenne (amélioration UX)
1. **Activer saisie moyens de paiement** : Remplacer message informatif par checkboxes dans formulaire établissement

---

**Note** : Cette analyse identifie uniquement les écarts. Aucune solution technique n'est proposée, conformément aux règles impératives.
