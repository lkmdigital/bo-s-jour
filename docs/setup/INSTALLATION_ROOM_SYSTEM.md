# Guide d'installation - Système de gestion des chambres avec images

## 📋 Résumé des fonctionnalités

### Pour les propriétaires
- ✅ Ajouter des chambres avec descriptions détaillées
- ✅ Upload d'images (minimum 3 par chambre)
- ✅ Gérer l'ordre des images
- ✅ Définir une image principale
- ✅ Activer/Désactiver les chambres
- ✅ **Voir les statistiques des chambres dans le dashboard**

### Pour les voyageurs
- ✅ Voir les chambres avec carousel d'images avant réservation
- ✅ Comparer les chambres visuellement
- ✅ Voir les détails : capacité, prix, équipements
- ✅ Sélectionner une chambre spécifique ou l'hébergement complet

### Pour les admins
- ✅ **Voir les statistiques globales des chambres**
- ✅ Surveiller les chambres sans images suffisantes
- ✅ Voir le nombre total d'images uploadées

## 🚀 Installation

### Étape 1 : Créer la table `room_images`

#### Option A : Via migration Laravel (recommandé)
```bash
cd backend
php artisan migrate
```

#### Option B : Via SQL direct (phpMyAdmin ou MySQL CLI)
```bash
# Fichier SQL disponible : backend/database/sql/create_room_images_table.sql

# Via MySQL CLI
mysql -u u698699576_paysuser -p u698699576_paysbase < backend/database/sql/create_room_images_table.sql

# Ou copier-coller le contenu dans phpMyAdmin
```

### Étape 2 : Vérifier l'installation

```sql
-- Vérifier que la table existe
SHOW TABLES LIKE 'room_images';

-- Voir la structure
DESCRIBE room_images;

-- Compter les enregistrements
SELECT COUNT(*) FROM room_images;
```

### Étape 3 : Configurer le storage

```bash
# Créer le lien symbolique pour le storage public
php artisan storage:link

# Vérifier les permissions
chmod -R 775 storage/app/public
```

## 📊 Statistiques ajoutées

### Dashboard Propriétaire (`/dashboard/host`)

Nouvelles statistiques visibles :
- **Total de chambres** : Nombre total de chambres créées
- **Chambres actives** : Chambres avec >= 3 images et activées
- **Chambres inactives** : Chambres désactivées ou sans images suffisantes
- **Chambres nécessitant des images** : Chambres avec < 3 images
- **Moyenne d'images par chambre** : Qualité du contenu visuel
- **Réservations de chambres (30j)** : Performance des chambres

**Alerte visuelle** : Un badge jaune alerte si des chambres nécessitent des images.

**Conseil automatique** : Message d'encouragement pour ajouter des images de qualité.

### Dashboard Admin (`/dashboard/admin`)

Nouvelles statistiques globales :
- **Total de chambres** : Sur toute la plateforme
- **Chambres actives** : Chambres disponibles à la réservation
- **Chambres inactives** : Chambres non publiées
- **Chambres sans images suffisantes** : Nécessitant intervention
- **Moyenne d'images par chambre** : Qualité globale du contenu
- **Total d'images uploadées** : Volume de contenu visuel

## 📁 Fichiers créés

### Backend
```
backend/
├── database/
│   ├── migrations/
│   │   └── 2026_01_12_100001_create_room_images_table.php
│   └── sql/
│       └── create_room_images_table.sql ⭐ NOUVEAU
├── app/
│   ├── Models/
│   │   ├── RoomImage.php ⭐ NOUVEAU
│   │   └── Room.php (modifié)
│   └── Http/Controllers/
│       ├── RoomController.php (modifié)
│       └── AnalyticsController.php (modifié)
└── Documentation/
    ├── ROOM_IMAGES_GUIDE.md
    ├── ROOM_MANAGEMENT_SUMMARY.md
    ├── SQL_ROOM_IMAGES_README.md ⭐ NOUVEAU
    └── INSTALLATION_ROOM_SYSTEM.md ⭐ CE FICHIER
```

### Frontend
```
frontend/
├── components/
│   ├── room/
│   │   ├── RoomCard.tsx ⭐ NOUVEAU
│   │   └── RoomList.tsx ⭐ NOUVEAU
│   ├── dashboard/
│   │   └── RoomStatsCard.tsx ⭐ NOUVEAU
│   └── booking/
│       └── EnhancedBookingForm.tsx (modifié)
└── app/dashboard/host/accommodations/[id]/
    └── rooms/
        ├── page.tsx ⭐ NOUVEAU
        ├── new/
        │   └── page.tsx ⭐ NOUVEAU
        └── [roomId]/
            ├── images/
            │   └── page.tsx ⭐ NOUVEAU
            └── edit/
                └── page.tsx ⭐ NOUVEAU
```

## 🎯 Nouvelles routes API

### Routes d'images (Host uniquement)
```
POST   /api/accommodations/{id}/rooms/{roomId}/images
DELETE /api/accommodations/{id}/rooms/{roomId}/images/{imageId}
POST   /api/accommodations/{id}/rooms/{roomId}/images/{imageId}/primary
POST   /api/accommodations/{id}/rooms/{roomId}/images/reorder
```

### Routes de chambres (améliorées)
```
GET  /api/accommodations/{id}/rooms
     → Inclut maintenant : images, primaryImage

GET  /api/accommodations/{id}/rooms/{roomId}
     → Inclut maintenant : images, primaryImage, activePromotions
```

### Routes d'analytics (améliorées)
```
GET /api/analytics/host
    → Ajoute : room_stats

GET /api/analytics/admin
    → Ajoute : room_stats
```

## 🎨 Nouvelles pages frontend

### Pour les propriétaires
1. **Liste des chambres** : `/dashboard/host/accommodations/{id}/rooms`
   - Vue d'ensemble de toutes les chambres
   - Statut visuel (actif/inactif)
   - Compteur d'images (X / 3 min)
   - Actions rapides

2. **Créer une chambre** : `/dashboard/host/accommodations/{id}/rooms/new`
   - Formulaire complet
   - Descriptions bilingues
   - Redirection automatique vers gestion des images

3. **Gérer les images** : `/dashboard/host/accommodations/{id}/rooms/{roomId}/images`
   - Upload multiple drag & drop
   - Affichage grid
   - Définir l'image principale
   - Suppression protégée

4. **Modifier une chambre** : `/dashboard/host/accommodations/{id}/rooms/{roomId}/edit`
   - Formulaire de modification
   - Activation/Désactivation
   - Lien vers gestion des images

### Pour les voyageurs
- **Sélection de chambre améliorée** dans le formulaire de réservation
  - Affichage visuel avec images
  - Carousel interactif
  - Comparaison facile

## ✅ Checklist de vérification

### Backend
- [ ] Table `room_images` créée (migration exécutée)
- [ ] Fichier `RoomImage.php` présent dans `app/Models/`
- [ ] Routes d'images ajoutées dans `routes/api.php`
- [ ] AnalyticsController mis à jour avec room_stats
- [ ] Storage lié (`php artisan storage:link`)

### Frontend
- [ ] Composant `RoomCard.tsx` créé
- [ ] Composant `RoomList.tsx` créé
- [ ] Composant `RoomStatsCard.tsx` créé
- [ ] Pages de gestion des chambres créées
- [ ] EnhancedBookingForm mis à jour
- [ ] Dashboard host affiche room_stats
- [ ] Dashboard admin affiche room_stats

### Tests
- [ ] Créer une chambre
- [ ] Upload de 3 images minimum
- [ ] Vérifier activation automatique
- [ ] Tester la réservation avec sélection de chambre
- [ ] Vérifier les statistiques dans les dashboards
- [ ] Tester la suppression protégée

## 🔍 Requêtes SQL utiles

### Voir les chambres sans images suffisantes
```sql
SELECT 
    a.name as accommodation_name,
    r.id,
    r.name as room_name,
    COUNT(ri.id) as image_count
FROM rooms r
JOIN accommodations a ON r.accommodation_id = a.id
LEFT JOIN room_images ri ON r.id = ri.room_id
GROUP BY r.id, r.name, a.name
HAVING image_count < 3 OR image_count IS NULL
ORDER BY image_count ASC;
```

### Statistiques globales des chambres
```sql
SELECT 
    COUNT(DISTINCT r.id) as total_rooms,
    SUM(CASE WHEN r.is_active = 1 THEN 1 ELSE 0 END) as active_rooms,
    COUNT(DISTINCT ri.id) as total_images,
    ROUND(COUNT(DISTINCT ri.id) / NULLIF(COUNT(DISTINCT r.id), 0), 1) as avg_images_per_room
FROM rooms r
LEFT JOIN room_images ri ON r.id = ri.room_id;
```

### Chambres les plus réservées
```sql
SELECT 
    r.id,
    r.name,
    a.name as accommodation_name,
    COUNT(b.id) as total_bookings,
    COUNT(ri.id) as image_count
FROM rooms r
JOIN accommodations a ON r.accommodation_id = a.id
LEFT JOIN bookings b ON r.id = b.room_id AND b.status = 'confirmed'
LEFT JOIN room_images ri ON r.id = ri.room_id
GROUP BY r.id, r.name, a.name
ORDER BY total_bookings DESC
LIMIT 10;
```

## 🛠️ Dépannage

### Erreur : Table 'room_images' doesn't exist

```bash
# Vérifier les migrations
php artisan migrate:status

# Exécuter la migration spécifique
php artisan migrate --path=/database/migrations/2026_01_12_100001_create_room_images_table.php

# Ou utiliser le fichier SQL direct
mysql -u username -p database_name < backend/database/sql/create_room_images_table.sql
```

### Erreur : Cannot delete image (minimum 3)

C'est normal ! C'est une protection pour garantir que chaque chambre garde au moins 3 images.

### Les chambres n'apparaissent pas dans le booking

Vérifiez que :
1. La chambre a au moins 3 images
2. La chambre est active (`is_active = true`)
3. La chambre appartient bien à l'établissement

### Les statistiques ne s'affichent pas

```bash
# Vérifier les logs
tail -f backend/storage/logs/laravel.log

# Tester l'endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" https://apimonbeaupays.loyerpay.ci/api/analytics/host
```

## 📞 Support

Fichiers de documentation disponibles :
- `ROOM_IMAGES_GUIDE.md` : Guide technique des images
- `ROOM_MANAGEMENT_SUMMARY.md` : Résumé de l'implémentation
- `SQL_ROOM_IMAGES_README.md` : Guide SQL complet
- `CHANGELOG_ROOMS.md` : Journal des modifications

## 🎉 Prêt à utiliser !

Une fois l'installation terminée :
1. Connectez-vous en tant que propriétaire
2. Allez dans votre dashboard
3. Cliquez sur "Gérer" pour un établissement
4. Accédez à l'onglet "Chambres" (nouveau lien)
5. Créez votre première chambre avec images !
