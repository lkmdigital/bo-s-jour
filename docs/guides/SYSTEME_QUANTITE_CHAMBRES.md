# ✅ Système de gestion de quantité pour les chambres

## 🎯 Fonctionnalités implémentées

1. **Champ `quantity`** : Nombre total de chambres de ce type
2. **Réservation automatique** : Décrémente la disponibilité selon la quantité
3. **Affichage dynamique** : "X disponibles sur Y" au lieu de disponible/indisponible
4. **Formulaire d'ajout** : Possibilité de spécifier la quantité lors de la création
5. **Formulaire d'édition** : Possibilité de modifier la quantité

---

## 📋 Modifications apportées

### 1. Base de données

**Fichier** : `backend/database/sql/add_quantity_to_rooms.sql`

```sql
ALTER TABLE `rooms`
ADD COLUMN `quantity` INT UNSIGNED NOT NULL DEFAULT 1 
COMMENT 'Nombre total de chambres de ce type' 
AFTER `is_active`;
```

**Logique** :
- `quantity = 1` : Chambre unique (une réservation la rend indisponible)
- `quantity > 1` : Plusieurs chambres (la réservation décrémente le compteur)

**À exécuter** :
```bash
# Via phpMyAdmin
1. Ouvrir phpMyAdmin
2. Sélectionner la base de données
3. Onglet SQL
4. Copier-coller le contenu de add_quantity_to_rooms.sql
5. Exécuter
```

---

### 2. Backend - Modèle Room

**Fichier** : `backend/app/Models/Room.php`

**Ajouté** :
```php
'quantity', // Nombre total de chambres de ce type
```

---

### 3. Backend - RoomController

**Fichier** : `backend/app/Http/Controllers/RoomController.php`

#### Validation ajoutée :
```php
'quantity' => 'nullable|integer|min:1|max:100',
```

#### Méthode `checkRoomAvailability()` modifiée :
- **Avant** : Retournait `true/false`
- **Après** : Retourne le **nombre de chambres disponibles** (0, 1, 2, 3...)

**Logique** :
```php
$quantity = $room->quantity ?? 1; // Par défaut 1
$bookingsCount = // Compter les réservations confirmées
$available = max(0, $quantity - $bookingsCount);
return $available; // Retourne le nombre disponible
```

#### Méthodes `indexPublic()` et `showPublic()` modifiées :
- Ajoutent `available_quantity` dans la réponse
- Calculent dynamiquement selon les dates sélectionnées

---

### 4. Backend - BookingController

**Fichier** : `backend/app/Http/Controllers/BookingController.php`

#### Vérification de disponibilité améliorée :

**Avant** :
```php
if ($conflictingBookings) {
    return error; // Chambre occupée
}
```

**Après** :
```php
$roomQuantity = $room->quantity ?? 1;
$confirmedBookingsCount = // Compter les réservations confirmées

if ($confirmedBookingsCount >= $roomQuantity) {
    return error; // Toutes les chambres sont réservées
}
```

**Résultat** :
- ✅ Si `quantity = 1` : Une réservation rend la chambre indisponible
- ✅ Si `quantity = 3` : Jusqu'à 3 réservations simultanées possibles

---

### 5. Frontend - Formulaire d'ajout de chambre

**Fichier** : `frontend/app/dashboard/host/accommodations/[id]/rooms/new/page.tsx`

**Ajouté** :
- Champ `quantity` avec validation (1-100)
- Message explicatif avec exemples
- Valeur par défaut : 1

**Interface** :
```
┌─────────────────────────────────────────┐
│ Nombre de chambres de ce type           │
│ [1]                                      │
│                                         │
│ Indiquez combien de chambres identiques│
│ de ce type vous avez.                   │
│ Exemple : Si vous avez 3 chambres      │
│ doubles identiques, indiquez 3.         │
│ Par défaut : 1 (chambre unique)        │
└─────────────────────────────────────────┘
```

---

### 6. Frontend - Formulaire d'édition de chambre

**Fichier** : `frontend/app/dashboard/host/accommodations/[id]/rooms/[roomId]/edit/page.tsx`

**Ajouté** :
- Champ `quantity` modifiable
- Pré-rempli avec la valeur existante
- Même interface que le formulaire d'ajout

---

### 7. Frontend - Affichage des chambres

**Fichier** : `frontend/components/accommodation/RoomsList.tsx`

#### Badge de disponibilité amélioré :

**Sans dates** :
```
[Vérifier disponibilité] (bleu)
[3 chambres] (badge secondaire)
```

**Avec dates - Disponible** :
```
[2/3 disponibles] (vert) ← Si quantity > 1
[Disponible] (vert) ← Si quantity = 1
```

**Avec dates - Complet** :
```
[Complet] (rouge) ← Si quantity > 1
[Occupée] (rouge) ← Si quantity = 1
```

#### Affichage sous le prix :
```
75 000 FCFA
par nuit
2 disponibles sur 3 ← Si dates sélectionnées et quantity > 1
```

---

### 8. Frontend - Page de détails de chambre

**Fichier** : `frontend/app/rooms/[id]/page.tsx`

**Ajouté** :
- Affichage de `quantity` et `available_quantity`
- Badge "X disponibles sur Y" dans la colonne de réservation
- Support des dates depuis l'URL (`?check_in=...&check_out=...`)

---

## 🔄 Flux de réservation

### Scénario 1 : Chambre unique (quantity = 1)

```
1. Utilisateur sélectionne dates
2. Vérification : available_quantity = 1
3. Réservation créée
4. Prochaine vérification : available_quantity = 0
5. Chambre marquée comme "Occupée"
```

### Scénario 2 : Plusieurs chambres (quantity = 3)

```
1. Utilisateur sélectionne dates
2. Vérification : available_quantity = 3
3. Réservation 1 créée → available_quantity = 2
4. Réservation 2 créée → available_quantity = 1
5. Réservation 3 créée → available_quantity = 0
6. Chambre marquée comme "Complet"
```

---

## 📊 Exemples d'affichage

### Chambre unique (quantity = 1)

**Sans dates** :
```
┌─────────────────────┐
│ Chambre Deluxe      │
│ [Vérifier dispo]    │
│ 75 000 FCFA/nuit    │
└─────────────────────┘
```

**Avec dates - Disponible** :
```
┌─────────────────────┐
│ Chambre Deluxe      │
│ [Disponible] (vert) │
│ 75 000 FCFA/nuit    │
└─────────────────────┘
```

**Avec dates - Occupée** :
```
┌─────────────────────┐
│ Chambre Deluxe      │
│ [Occupée] (rouge)   │
│ 75 000 FCFA/nuit    │
│ [Indisponible]      │
└─────────────────────┘
```

### Plusieurs chambres (quantity = 3)

**Sans dates** :
```
┌─────────────────────┐
│ Chambre Double      │
│ [Vérifier dispo]    │
│ [3 chambres]        │
│ 50 000 FCFA/nuit    │
└─────────────────────┘
```

**Avec dates - 2 disponibles** :
```
┌─────────────────────┐
│ Chambre Double      │
│ [2/3 disponibles]   │
│ 50 000 FCFA/nuit    │
│ 2 disponibles sur 3  │
└─────────────────────┘
```

**Avec dates - Complet** :
```
┌─────────────────────┐
│ Chambre Double      │
│ [Complet] (rouge)   │
│ 50 000 FCFA/nuit    │
│ [Indisponible]      │
└─────────────────────┘
```

---

## 🧪 Tests à effectuer

### Test 1 : Créer une chambre avec quantity = 3

```
1. Dashboard hôte → Ajouter chambre
2. Remplir les champs
3. Quantité : 3
4. Créer
5. ✅ Vérifier en BDD : quantity = 3
```

### Test 2 : Réservation décrémente la disponibilité

```
1. Créer 3 réservations pour les mêmes dates
2. Réservation 1 → ✅ Succès (3 disponibles)
3. Réservation 2 → ✅ Succès (2 disponibles)
4. Réservation 3 → ✅ Succès (1 disponible)
5. Réservation 4 → ❌ Erreur "All rooms booked"
```

### Test 3 : Affichage frontend

```
1. Page hébergement → Sélectionner dates
2. ✅ Voir "2/3 disponibles" sur badge vert
3. ✅ Voir "2 disponibles sur 3" sous le prix
4. Cliquer "Voir détails"
5. ✅ Page chambre affiche aussi "2 disponibles sur 3"
```

---

## 📤 Fichiers à déployer

### Backend

```
✅ database/sql/add_quantity_to_rooms.sql        (NOUVEAU - À exécuter en BDD)
✅ app/Models/Room.php                           (MODIFIÉ)
✅ app/Http/Controllers/RoomController.php        (MODIFIÉ)
✅ app/Http/Controllers/BookingController.php     (MODIFIÉ)
```

### Frontend

```
✅ app/dashboard/host/accommodations/[id]/rooms/new/page.tsx          (MODIFIÉ)
✅ app/dashboard/host/accommodations/[id]/rooms/[roomId]/edit/page.tsx (MODIFIÉ)
✅ components/accommodation/RoomsList.tsx                             (MODIFIÉ)
✅ app/rooms/[id]/page.tsx                                            (MODIFIÉ)
✅ app/accommodations/[id]/page.tsx                                    (MODIFIÉ)
```

---

## 🚀 Déploiement

### 1. Base de données (IMPORTANT - EN PREMIER)

```sql
-- Via phpMyAdmin
ALTER TABLE `rooms`
ADD COLUMN `quantity` INT UNSIGNED NOT NULL DEFAULT 1 
COMMENT 'Nombre total de chambres de ce type' 
AFTER `is_active`;

-- Mettre à jour les chambres existantes
UPDATE `rooms` SET `quantity` = 1 WHERE `quantity` = 0 OR `quantity` IS NULL;
```

### 2. Backend (via FTP)

```
RoomController.php → /app/Http/Controllers/
BookingController.php → /app/Http/Controllers/
Room.php → /app/Models/
```

Puis vider le cache :
```
https://apimonbeaupays.loyerpay.ci/clear-cache.php
```

### 3. Frontend

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend
npm run build
./update-frontend.sh
```

---

## ✅ Avantages

### Pour les hôtes
- ✅ Gérer plusieurs chambres identiques facilement
- ✅ Pas besoin de créer 3 chambres séparées pour 3 chambres doubles identiques
- ✅ Modification simple de la quantité

### Pour les visiteurs
- ✅ Transparence : "2 disponibles sur 3"
- ✅ Meilleure compréhension de la disponibilité
- ✅ Évite les déceptions (sait combien de chambres restent)

### Pour la plateforme
- ✅ Gestion plus efficace des inventaires
- ✅ Réduction de la duplication de données
- ✅ Système plus flexible et évolutif

---

**Date** : 2026-01-22  
**Fonctionnalité** : ✅ Système de quantité pour chambres  
**Status** : 🚀 Prêt pour déploiement
