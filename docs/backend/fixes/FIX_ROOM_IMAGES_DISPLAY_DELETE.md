# 🔧 Fix : Images des chambres ne s'affichent pas + Suppression

## 🐛 Problèmes identifiés

### 1. Les images ne s'affichent pas
**Cause** : Le modèle `RoomImage` utilise `Storage::url()` qui génère des URLs relatives (`/storage/rooms/image.jpg`). Sur un hébergement mutualisé, le lien symbolique `storage` n'existe pas ou n'est pas accessible.

**Solution** : ✅ Modifié `RoomImage.php` pour générer des URLs complètes avec le domaine.

### 2. Impossible de supprimer les images
**État** : La logique est correcte :
- ✅ Bouton désactivé si ≤ 3 images (normal)
- ✅ Bouton actif si ≥ 4 images
- ✅ Backend vérifie qu'il reste au moins 3 images

---

## ✅ Modifications apportées

### Fichier : `app/Models/RoomImage.php`

#### Avant :
```php
public function getFullUrlAttribute()
{
    if (!$this->image_path) {
        return null;
    }

    if (preg_match('/^https?:\/\//', $this->image_path)) {
        return $this->image_path;
    }

    return Storage::url($this->image_path); // ❌ URL relative
}
```

#### Après :
```php
public function getFullUrlAttribute()
{
    if (!$this->image_path) {
        return null;
    }

    if (preg_match('/^https?:\/\//', $this->image_path)) {
        return $this->image_path;
    }

    // ✅ Générer l'URL complète avec le domaine
    $baseUrl = rtrim(config('app.url'), '/');
    $path = ltrim($this->image_path, '/');
    
    if (!str_starts_with($path, 'storage/')) {
        $path = 'storage/' . $path;
    }
    
    return $baseUrl . '/' . $path;
}
```

---

## 📤 Fichiers à uploader sur le serveur

### Fichier modifié :
```
Local : /Users/lkmdigital/monbeaupays.com/backend/app/Models/RoomImage.php
Serveur : /app/Models/RoomImage.php
```

---

## 🧪 Tests après déploiement

### 1. Vérifier l'affichage des images
1. Connectez-vous en tant que propriétaire
2. Allez dans **Dashboard → Hébergement → Chambres → Gérer les images**
3. **Résultat attendu** : Les images s'affichent correctement

### 2. Vérifier la suppression
1. Assurez-vous d'avoir **au moins 4 images** uploadées
2. Cliquez sur le bouton **Poubelle** (Trash)
3. Confirmez la suppression
4. **Résultat attendu** : L'image est supprimée

### 3. Tester avec exactement 3 images
1. Gardez exactement **3 images**
2. **Résultat attendu** : Le bouton de suppression est **désactivé** (grisé)
3. **Tooltip** : "Minimum 3 images requises"

---

## 🔍 Vérification des URLs générées

### Exemple d'URL attendue :
```
Avant : /storage/rooms/image123.jpg
Après  : https://apimonbeaupays.loyerpay.ci/storage/rooms/image123.jpg
```

### Comment vérifier :
1. Uploadez une image
2. Dans la console du navigateur (F12) :
   ```javascript
   // Inspectez l'élément <img>
   document.querySelector('img').src
   ```
3. **Résultat attendu** : URL complète commençant par `https://`

---

## 📊 Logique de suppression (rappel)

| Nombre d'images | Bouton de suppression | Comportement |
|----------------|----------------------|--------------|
| 1-3 images     | ❌ Désactivé          | Minimum requis |
| 4+ images      | ✅ Activé             | Suppression OK |

**Backend** : Vérifie qu'il reste au moins 3 images après suppression.

---

## 🚨 Dépannage

### Les images ne s'affichent toujours pas

#### Vérifier APP_URL dans .env
```env
APP_URL=https://apimonbeaupays.loyerpay.ci
```

#### Vérifier que le dossier storage existe
Sur le serveur :
```
/storage/
  └── rooms/
      ├── image1.jpg
      ├── image2.jpg
      └── ...
```

#### Vérifier les permissions
Le dossier `storage/` doit avoir les permissions `755` ou `775`.

### La suppression ne fonctionne pas

#### 1. Vérifier la console du navigateur (F12)
Cherchez les erreurs :
- `403 Forbidden` → Problème d'authentification
- `400 Bad Request` → Le backend refuse (minimum 3 images)
- `500 Server Error` → Erreur serveur

#### 2. Vérifier les logs Laravel
Fichier : `/storage/logs/laravel.log`

#### 3. Tester l'API directement
```bash
# Récupérer le token depuis le localStorage
# Puis tester dans le terminal :

curl -X DELETE \
  https://apimonbeaupays.loyerpay.ci/api/accommodations/10/rooms/27/images/1 \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Accept: application/json"
```

**Réponse attendue** :
```json
{
  "message": "Image deleted successfully"
}
```

---

## 📝 Checklist de déploiement

- [ ] ✅ `RoomImage.php` modifié localement
- [ ] 📤 Uploader `RoomImage.php` via FTP
- [ ] 🧹 Vider le cache Laravel (clear-cache.php)
- [ ] 🧪 Tester l'affichage des images
- [ ] 🧪 Tester la suppression (avec 4+ images)
- [ ] 🧪 Vérifier que 3 images min sont obligatoires
- [ ] ✅ Images s'affichent correctement
- [ ] ✅ Suppression fonctionne

---

## 🎯 Améliorations futures (optionnel)

### 1. Feedback visuel amélioré
Ajouter un spinner pendant la suppression :
```typescript
const [deleting, setDeleting] = useState<number | null>(null);

const handleDelete = async (imageId: number) => {
  setDeleting(imageId);
  try {
    await api.delete(...);
  } finally {
    setDeleting(null);
  }
};
```

### 2. Messages de succès
Ajouter un toast/notification après suppression réussie.

### 3. Drag & Drop pour réorganiser
Permettre de changer l'ordre des images par glisser-déposer.

---

**Date** : 2026-01-21  
**Problèmes** : Images invisibles + Suppression  
**Solution** : URLs complètes + Validation correcte
