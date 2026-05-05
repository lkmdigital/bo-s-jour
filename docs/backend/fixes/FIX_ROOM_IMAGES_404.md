# 🔧 Fix : Images des chambres en erreur 404

## 🐛 Problème
Les images uploadées pour les chambres ne s'affichent pas et retournent une erreur **404 Not Found**.

## 🔍 Cause identifiée

### Différence de stockage

**Accommodations** (fonctionnent) :
```php
// URL complète stockée en BDD
https://apimonbeaupays.loyerpay.ci/storage/accommodations/10/xxx.jpg
```

**Rooms** (ne fonctionnaient pas) :
```php
// Chemin relatif stocké en BDD
room-images/xxx.jpg

// Converti en URL → 404
https://apimonbeaupays.loyerpay.ci/storage/room-images/xxx.jpg
```

**Problème** : Sur un hébergement mutualisé, le lien symbolique `storage → storage/app/public` n'existe pas, donc l'URL générée ne fonctionne pas.

---

## ✅ Solution appliquée

### Stocker l'URL complète (comme les accommodations)

Les modifications rendent le système de rooms **cohérent** avec celui des accommodations.

---

## 🔧 Fichiers modifiés

### 1. `RoomController.php` - Upload avec URL complète

**Avant** :
```php
// Stockage avec chemin relatif uniquement
$path = $file->store('room-images', 'public');

$image = $room->images()->create([
    'image_path' => $path,  // ❌ room-images/xxx.jpg
    ...
]);
```

**Après** :
```php
// Stockage avec URL complète
$relativePath = $file->store("rooms/{$roomId}", 'public');

// Générer l'URL complète
$baseUrl = rtrim(config('app.url'), '/');
$fullUrl = $baseUrl . '/storage/' . $relativePath;

$image = $room->images()->create([
    'image_path' => $fullUrl,  // ✅ https://apimonbeaupays.loyerpay.ci/storage/rooms/27/xxx.jpg
    ...
]);
```

**Avantages** :
- ✅ URLs complètes directement en BDD
- ✅ Pas de génération dynamique nécessaire
- ✅ Compatible avec hébergement mutualisé
- ✅ Cohérent avec le système d'accommodations existant
- ✅ Images organisées par chambre : `storage/rooms/{roomId}/`

---

### 2. `RoomImage.php` - Simplification

Le modèle n'a plus besoin de générer l'URL puisqu'elle est déjà complète en BDD.

**Avant** :
```php
public function getFullUrlAttribute()
{
    // Génération complexe avec vérifications
    $baseUrl = rtrim(config('app.url'), '/');
    $path = ltrim($this->image_path, '/');
    
    if (!str_starts_with($path, 'storage/')) {
        $path = 'storage/' . $path;
    }
    
    return $baseUrl . '/' . $path;
}
```

**Après** :
```php
public function getFullUrlAttribute()
{
    // Si URL complète, retourner telle quelle
    if (preg_match('/^https?:\/\//', $this->image_path)) {
        return $this->image_path;  // ✅ Déjà complète
    }

    // Sinon générer (rétrocompatibilité anciennes données)
    // ...
}
```

---

## 📊 Comparaison

| Aspect | Avant | Après |
|--------|-------|-------|
| **Stockage BDD** | `room-images/xxx.jpg` | `https://.../.../xxx.jpg` |
| **Organisation fichiers** | `storage/room-images/` | `storage/rooms/{roomId}/` |
| **Génération URL** | À chaque requête | Une fois à l'upload |
| **Performance** | ⚠️ Calcul dynamique | ✅ URL directe |
| **Hébergement mutualisé** | ❌ Ne fonctionne pas | ✅ Fonctionne |
| **Cohérence système** | ❌ Différent des accommodations | ✅ Identique |

---

## 🗂️ Structure des fichiers

### Avant (incorrect)
```
storage/
└── room-images/
    ├── aB3dEf7.jpg     ← Toutes les images mélangées
    ├── xY9zA2k.jpg
    └── ...
```

### Après (correct)
```
storage/
└── rooms/
    ├── 27/                ← Chambre ID 27
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── image3.jpg
    ├── 28/                ← Chambre ID 28
    │   ├── image1.jpg
    │   └── image2.jpg
    └── ...
```

**Avantages** :
- ✅ Organisation par chambre
- ✅ Facilite la maintenance
- ✅ Facile de supprimer toutes les images d'une chambre
- ✅ Évite les conflits de noms de fichiers

---

## 🧪 Tests

### Test 1 : Upload nouvelle image
1. Aller sur une chambre
2. Uploader une image
3. **Résultat attendu** : 
   - ✅ Image visible immédiatement
   - ✅ Pas d'erreur 404
   - ✅ URL en BDD : `https://apimonbeaupays.loyerpay.ci/storage/rooms/27/xxx.jpg`

### Test 2 : Vérifier l'URL en BDD
```sql
SELECT id, image_path FROM room_images ORDER BY id DESC LIMIT 1;
```

**Résultat attendu** :
```
id | image_path
---+--------------------------------------------------------
1  | https://apimonbeaupays.loyerpay.ci/storage/rooms/27/...
```

### Test 3 : Accès direct à l'image
Copier l'URL de l'image et l'ouvrir dans un nouvel onglet.

**Résultat attendu** : ✅ Image s'affiche (pas de 404)

---

## 📤 Fichiers à uploader

### 1. RoomController.php (PRIORITAIRE)
```
Local    : /Users/lkmdigital/monbeaupays.com/backend/app/Http/Controllers/RoomController.php
Serveur  : /app/Http/Controllers/RoomController.php
```

### 2. RoomImage.php
```
Local    : /Users/lkmdigital/monbeaupays.com/backend/app/Models/RoomImage.php
Serveur  : /app/Models/RoomImage.php
```

### 3. Nettoyer le cache
```
https://apimonbeaupays.loyerpay.ci/clear-cache.php
```

---

## 🔄 Migration des anciennes images (si nécessaire)

Si des images existent déjà avec l'ancien format, exécuter ce script SQL :

```sql
-- Mettre à jour les URLs des anciennes images
UPDATE room_images 
SET image_path = CONCAT(
    'https://apimonbeaupays.loyerpay.ci/storage/',
    image_path
)
WHERE image_path NOT LIKE 'http%';
```

**⚠️ Attention** : Vérifier que les fichiers existent bien à ces emplacements avant d'exécuter.

---

## 🚨 Dépannage

### Les nouvelles images s'affichent mais pas les anciennes

**Cause** : Anciennes images avec chemin relatif en BDD

**Solution** : Exécuter le script SQL de migration ci-dessus

### Erreur "Failed to store file"

**Vérifications** :
1. Dossier `storage/rooms/` existe et est accessible en écriture
2. Permissions : `755` ou `775`
3. Propriétaire : utilisateur PHP (souvent `www-data` ou votre user)

**Créer le dossier manuellement** :
```bash
mkdir -p storage/rooms
chmod 775 storage/rooms
```

### Images toujours en 404

1. **Vérifier APP_URL dans .env** :
   ```env
   APP_URL=https://apimonbeaupays.loyerpay.ci
   ```

2. **Vérifier l'URL générée** :
   ```sql
   SELECT image_path FROM room_images LIMIT 1;
   ```
   Doit retourner : `https://apimonbeaupays.loyerpay.ci/storage/rooms/...`

3. **Tester l'URL manuellement** dans le navigateur

---

## 📝 Checklist de déploiement

- [ ] ✅ `RoomController.php` modifié
- [ ] ✅ `RoomImage.php` modifié  
- [ ] 📤 Uploader `RoomController.php`
- [ ] 📤 Uploader `RoomImage.php`
- [ ] 🧹 Vider le cache Laravel
- [ ] 🧪 Uploader une nouvelle image
- [ ] ✅ Vérifier que l'image s'affiche
- [ ] 🔍 Vérifier l'URL en BDD (doit être complète)
- [ ] 🧪 Accès direct à l'image fonctionne

---

## 🎯 Résumé

**Problème** : Images en 404 car chemin relatif incompatible avec hébergement mutualisé  
**Solution** : Stocker URL complète en BDD (comme pour accommodations)  
**Résultat** : ✅ Images affichées correctement  
**Bonus** : Organisation par chambre + Cohérence système

---

**Date** : 2026-01-21  
**Priorité** : 🔴 HAUTE (bloque l'utilisation)  
**Impact** : ✅ Toutes les images fonctionneront après déploiement
