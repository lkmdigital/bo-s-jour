# Guide - Gestion des images de chambres

## Fonctionnalités

### Backend

#### 1. Table `room_images`
- `image_path` : Chemin de l'image
- `thumbnail_path` : Miniature (optionnel)
- `is_primary` : Image principale (une seule par chambre)
- `sort_order` : Ordre d'affichage
- `caption` : Légende en français
- `caption_en` : Légende en anglais

#### 2. Validation
- **Minimum 3 images par chambre** : Une chambre doit avoir au moins 3 images pour être activée
- Types de fichiers acceptés : JPEG, JPG, PNG, WebP
- Taille maximale : 5 MB par image
- Une seule image principale par chambre

#### 3. Routes API

##### Upload d'image
```
POST /api/accommodations/{accommodationId}/rooms/{roomId}/images
Content-Type: multipart/form-data

Champs:
- image (required): fichier image
- caption (optional): légende
- caption_en (optional): légende en anglais
- is_primary (optional): définir comme image principale

Réponse:
{
  "image": {...},
  "room": {...},
  "images_count": 4,
  "can_activate": true
}
```

##### Supprimer une image
```
DELETE /api/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}

Note: Ne peut pas supprimer si cela fait descendre en dessous de 3 images
```

##### Définir l'image principale
```
POST /api/accommodations/{accommodationId}/rooms/{roomId}/images/{imageId}/primary
```

##### Réorganiser les images
```
POST /api/accommodations/{accommodationId}/rooms/{roomId}/images/reorder

Body:
{
  "image_ids": [3, 1, 4, 2]  // Nouvel ordre des IDs
}
```

##### Lister les chambres avec images
```
GET /api/accommodations/{accommodationId}/rooms

Réponse inclut automatiquement:
- images: toutes les images
- primaryImage: image principale
```

##### Détails d'une chambre
```
GET /api/accommodations/{accommodationId}/rooms/{roomId}

Réponse inclut:
- images
- primaryImage
- activePromotions
```

## Workflow de création de chambre

1. **Créer la chambre** : `POST /api/accommodations/{id}/rooms`
   - La chambre est créée avec `is_active = false`
   
2. **Ajouter des images** : `POST .../rooms/{roomId}/images` (minimum 3)
   - Upload la première image, marquer comme principale
   - Upload la deuxième image
   - Upload la troisième image
   - Après la 3ème image, la chambre devient automatiquement active

3. **Optionnel** : Réorganiser les images, ajouter plus d'images

## Migration

```bash
php artisan migrate
```

Cela créera la table `room_images`.

## Sécurité

- Vérification des types MIME
- Vérification de la propriété (seul le propriétaire peut gérer les images)
- Protection contre la suppression si moins de 3 images
- Validation des fichiers uploadés
