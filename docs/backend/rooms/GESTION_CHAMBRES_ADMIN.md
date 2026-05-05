# ✅ Gestion des chambres par l'admin

## 🎯 Fonctionnalités implémentées

L'admin peut maintenant :
1. **Voir toutes les chambres** (actives et inactives) de tous les établissements
2. **Créer des chambres** pour n'importe quel établissement
3. **Modifier les chambres** (tous les champs, y compris `is_active` et `quantity`)
4. **Supprimer des chambres** (avec vérification des réservations actives)
5. **Gérer les images** (upload, suppression, image principale)
6. **Activer/Désactiver les chambres** via une route dédiée

---

## 📋 Modifications apportées

### 1. RoomController.php

#### Méthode `index()` - Liste des chambres
**Avant** : Seul le propriétaire voyait toutes les chambres  
**Après** : Admin et propriétaire voient toutes les chambres (actives et inactives)

```php
$isAdmin = $user && $user->isAdmin();
$isHostOwner = $user && $user->isHost() && $accommodation->host_id === $user->id;

if (!$isAdmin && !$isHostOwner) {
    $query->active(); // Seulement les chambres actives pour les autres
}
```

#### Méthode `store()` - Créer une chambre
**Avant** : Seul le propriétaire pouvait créer  
**Après** : Admin et propriétaire peuvent créer

#### Méthode `update()` - Modifier une chambre
**Avant** : Seul le propriétaire pouvait modifier  
**Après** : Admin et propriétaire peuvent modifier (y compris `is_active`)

#### Méthode `destroy()` - Supprimer une chambre
**Avant** : Seul le propriétaire pouvait supprimer  
**Après** : Admin et propriétaire peuvent supprimer

#### Méthodes d'images (`uploadImage`, `deleteImage`, `setPrimaryImage`, `reorderImages`)
**Avant** : Seul le propriétaire pouvait gérer les images  
**Après** : Admin et propriétaire peuvent gérer les images

#### Nouvelle méthode `toggleStatus()` - Activer/Désactiver
**Route** : `POST /api/admin/accommodations/{accommodationId}/rooms/{roomId}/toggle-status`  
**Permissions** : Admin uniquement  
**Fonction** : Inverse le statut `is_active` de la chambre

```php
public function toggleStatus(Request $request, $accommodationId, $roomId)
{
    // Seul l'admin peut activer/désactiver
    if (!$user || !$user->isAdmin()) {
        return response()->json(['message' => 'Forbidden'], 403);
    }
    
    $room->is_active = !$room->is_active;
    $room->save();
    
    return response()->json([
        'message' => $room->is_active ? 'Chambre activée' : 'Chambre désactivée',
        'room' => $room->load(['images', 'primaryImage'])
    ]);
}
```

---

### 2. Routes API (`routes/api.php`)

#### Routes admin pour les chambres

Ajoutées dans le groupe `admin/accommodations/{accommodationId}/rooms` :

```php
Route::prefix('{accommodationId}/rooms')->group(function () {
    Route::get('/', [RoomController::class, 'index'])
        ->middleware('permission:accommodations.read');
    Route::get('/{id}', [RoomController::class, 'show'])
        ->middleware('permission:accommodations.read');
    Route::post('/', [RoomController::class, 'store'])
        ->middleware('permission:accommodations.update');
    Route::put('/{id}', [RoomController::class, 'update'])
        ->middleware('permission:accommodations.update');
    Route::delete('/{id}', [RoomController::class, 'destroy'])
        ->middleware('permission:accommodations.update');
    Route::post('/{roomId}/images', [RoomController::class, 'uploadImage'])
        ->middleware('permission:accommodations.update');
    Route::delete('/{roomId}/images/{imageId}', [RoomController::class, 'deleteImage'])
        ->middleware('permission:accommodations.update');
    Route::post('/{roomId}/images/{imageId}/primary', [RoomController::class, 'setPrimaryImage'])
        ->middleware('permission:accommodations.update');
    Route::post('/{roomId}/toggle-status', [RoomController::class, 'toggleStatus'])
        ->middleware('permission:accommodations.update');
});
```

---

## 🔐 Permissions

Toutes les routes admin utilisent le middleware `permission:accommodations.read` ou `permission:accommodations.update`.

**Permissions requises** :
- `accommodations.read` : Pour voir les chambres
- `accommodations.update` : Pour créer, modifier, supprimer, gérer les images, activer/désactiver

---

## 📊 Routes disponibles

### Pour l'admin

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/admin/accommodations/{accommodationId}/rooms` | Liste toutes les chambres (actives et inactives) |
| GET | `/api/admin/accommodations/{accommodationId}/rooms/{id}` | Détails d'une chambre |
| POST | `/api/admin/accommodations/{accommodationId}/rooms` | Créer une chambre |
| PUT | `/api/admin/accommodations/{accommodationId}/rooms/{id}` | Modifier une chambre (y compris `is_active`) |
| DELETE | `/api/admin/accommodations/{accommodationId}/rooms/{id}` | Supprimer une chambre |
| POST | `/api/admin/accommodations/{accommodationId}/rooms/{roomId}/images` | Uploader une image |
| DELETE | `/api/admin/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}` | Supprimer une image |
| POST | `/api/admin/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}/primary` | Définir image principale |
| POST | `/api/admin/accommodations/{accommodationId}/rooms/{roomId}/toggle-status` | Activer/Désactiver une chambre |

### Pour le host (inchangé)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/accommodations/{accommodationId}/rooms` | Liste ses chambres (actives et inactives) |
| GET | `/api/accommodations/{accommodationId}/rooms/{id}` | Détails d'une chambre |
| POST | `/api/accommodations/{accommodationId}/rooms` | Créer une chambre |
| PUT | `/api/accommodations/{accommodationId}/rooms/{id}` | Modifier une chambre |
| DELETE | `/api/accommodations/{accommodationId}/rooms/{id}` | Supprimer une chambre |
| ... | ... | (routes images identiques) |

---

## 🧪 Exemples d'utilisation

### 1. Activer/Désactiver une chambre (Admin)

```bash
POST /api/admin/accommodations/10/rooms/27/toggle-status
Authorization: Bearer {admin_token}
```

**Réponse** :
```json
{
  "message": "Chambre activée",
  "room": {
    "id": 27,
    "name": "Chambre Deluxe",
    "is_active": true,
    "quantity": 3,
    ...
  }
}
```

### 2. Modifier l'état d'une chambre (Admin)

```bash
PUT /api/admin/accommodations/10/rooms/27
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "is_active": false,
  "quantity": 5
}
```

### 3. Voir toutes les chambres d'un établissement (Admin)

```bash
GET /api/admin/accommodations/10/rooms
Authorization: Bearer {admin_token}
```

**Réponse** : Liste de toutes les chambres (actives et inactives)

---

## ✅ Vérifications de sécurité

### Pour toutes les méthodes
- ✅ Vérification que l'utilisateur est admin OU propriétaire
- ✅ Vérification des permissions RBAC pour les routes admin
- ✅ Vérification de l'existence de la chambre et de l'établissement

### Pour la suppression
- ✅ Vérification qu'il n'y a pas de réservations actives (`pending` ou `confirmed`)

### Pour toggleStatus
- ✅ Seul l'admin peut utiliser cette méthode (pas le propriétaire)

---

## 📤 Fichiers modifiés

```
✅ app/Http/Controllers/RoomController.php    (MODIFIÉ)
   - index() : Admin peut voir toutes les chambres
   - store() : Admin peut créer
   - update() : Admin peut modifier (y compris is_active)
   - destroy() : Admin peut supprimer
   - uploadImage() : Admin peut uploader
   - deleteImage() : Admin peut supprimer
   - setPrimaryImage() : Admin peut définir image principale
   - reorderImages() : Admin peut réorganiser
   - toggleStatus() : NOUVELLE méthode (admin uniquement)

✅ routes/api.php                              (MODIFIÉ)
   - Ajout des routes admin pour les chambres
```

---

## 🚀 Déploiement

### Backend

1. **Uploader les fichiers modifiés** :
   ```
   RoomController.php → /app/Http/Controllers/
   routes/api.php → /routes/
   ```

2. **Vider le cache** :
   ```
   https://apimonbeaupays.loyerpay.ci/clear-cache.php
   ```

3. **Vérifier les routes** :
   ```bash
   php artisan route:list --path=admin/accommodations
   ```

---

## 📝 Notes importantes

1. **Compatibilité** : Les routes host existantes continuent de fonctionner normalement
2. **Permissions** : L'admin doit avoir les permissions `accommodations.read` et `accommodations.update`
3. **Visibilité** : L'admin voit toutes les chambres, même inactives, pour pouvoir les gérer
4. **Toggle Status** : Seule l'admin peut utiliser `toggleStatus()`, pas le propriétaire (qui doit passer par `update()`)

---

**Date** : 2026-01-22  
**Fonctionnalité** : ✅ Gestion des chambres par l'admin  
**Status** : 🚀 Prêt pour déploiement
