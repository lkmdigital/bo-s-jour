# 🏨 Système de gestion des chambres avec images

## 📋 Vue d'ensemble

Système complet permettant aux propriétaires d'ajouter des chambres avec descriptions et images à leurs établissements, et aux voyageurs de visualiser ces chambres avant de réserver.

## ⭐ Fonctionnalités principales

### Pour les propriétaires
- ✅ Créer des chambres avec descriptions bilingues (FR/EN)
- ✅ Upload multiple d'images (minimum 3 requis)
- ✅ Définir une image principale
- ✅ Réordonner les images
- ✅ Activer/Désactiver les chambres
- ✅ Voir les statistiques dans le dashboard

### Pour les voyageurs
- ✅ Voir les chambres avec carousel d'images
- ✅ Comparer visuellement les chambres
- ✅ Sélectionner une chambre spécifique lors de la réservation

### Pour les administrateurs
- ✅ Statistiques globales des chambres
- ✅ Surveiller les chambres sans images suffisantes
- ✅ Voir le total d'images uploadées

## 🚀 Déploiement rapide

### Option 1 : Script automatique (recommandé)

```bash
./deploy-room-system-complete.sh
```

### Option 2 : Déploiement manuel

```bash
# 1. Base de données
mysql -u user -p database < backend/database/sql/create_room_images_table.sql

# 2. Frontend
cd frontend
./deploy-room-system.sh root@72.62.16.236
```

### Option 3 : Étape par étape

Suivre le guide : **DEPLOY_ROOM_SYSTEM.md**

## 📁 Structure du projet

```
monbeaupays.com/
├── backend/
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 2026_01_12_100001_create_room_images_table.php
│   │   └── sql/
│   │       └── create_room_images_table.sql ⭐
│   ├── app/
│   │   ├── Models/
│   │   │   ├── RoomImage.php ⭐
│   │   │   └── Room.php (modifié)
│   │   └── Http/Controllers/
│   │       ├── RoomController.php (modifié)
│   │       └── AnalyticsController.php (modifié)
│   └── routes/
│       └── api.php (modifié)
│
├── frontend/
│   ├── components/
│   │   ├── room/
│   │   │   ├── RoomCard.tsx ⭐
│   │   │   └── RoomList.tsx ⭐
│   │   ├── dashboard/
│   │   │   └── RoomStatsCard.tsx ⭐
│   │   └── booking/
│   │       └── EnhancedBookingForm.tsx (modifié)
│   ├── app/dashboard/
│   │   ├── host/
│   │   │   ├── page.tsx (modifié)
│   │   │   └── accommodations/[id]/rooms/ ⭐ 4 nouvelles pages
│   │   └── admin/
│   │       └── page.tsx (modifié)
│   └── deploy-room-system.sh ⭐
│
└── Documentation/ ⭐ 8 fichiers
```

## 📚 Documentation complète

### Guides principaux
1. **INSTALLATION_ROOM_SYSTEM.md** - Installation pas à pas
2. **DEPLOY_ROOM_SYSTEM.md** - Guide de déploiement complet
3. **QUICK_DEPLOY.md** - Déploiement rapide
4. **CHECKLIST_DEPLOIEMENT_CHAMBRES.md** - Checklist détaillée

### Documentation technique
5. **ROOM_IMAGES_GUIDE.md** - Guide technique des images
6. **ROOM_MANAGEMENT_SUMMARY.md** - Résumé de l'implémentation
7. **SQL_ROOM_IMAGES_README.md** - Guide SQL
8. **CHANGELOG_ROOMS.md** - Journal des modifications

### Résumés
9. **RESUME_IMPLEMENTATION_CHAMBRES.md** - Résumé global
10. **FICHIERS_DEPLOIEMENT_CHAMBRES.txt** - Liste des fichiers
11. **README_SYSTEME_CHAMBRES.md** - Ce fichier

## 🔧 Installation locale

### Backend

```bash
cd backend

# Créer la table
php artisan migrate

# Ou via SQL
mysql -u user -p database < database/sql/create_room_images_table.sql

# Vérifier
php artisan tinker
>>> \App\Models\RoomImage::count()
```

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Développement
npm run dev

# Build
npm run build
```

## 🧪 Tests

### Tests backend

```bash
# Test API chambres
curl http://localhost:8000/api/accommodations/1/rooms

# Test statistiques
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:8000/api/analytics/host
```

### Tests frontend

1. Se connecter en tant que propriétaire
2. Accéder au dashboard host
3. Vérifier les statistiques des chambres
4. Créer une chambre
5. Uploader 3 images
6. Vérifier l'activation automatique

## 📊 API Endpoints

### Chambres
```
GET    /api/accommodations/{id}/rooms              - Liste des chambres
GET    /api/accommodations/{id}/rooms/{roomId}     - Détails d'une chambre
POST   /api/accommodations/{id}/rooms              - Créer une chambre
PUT    /api/accommodations/{id}/rooms/{roomId}     - Modifier une chambre
DELETE /api/accommodations/{id}/rooms/{roomId}     - Supprimer une chambre
```

### Images
```
POST   /api/accommodations/{id}/rooms/{roomId}/images                  - Upload images
DELETE /api/accommodations/{id}/rooms/{roomId}/images/{imageId}        - Supprimer image
POST   /api/accommodations/{id}/rooms/{roomId}/images/{imageId}/primary - Définir principale
POST   /api/accommodations/{id}/rooms/{roomId}/images/reorder          - Réordonner
```

### Statistiques
```
GET /api/analytics/host  - Stats propriétaire (inclut room_stats)
GET /api/analytics/admin - Stats admin (inclut room_stats)
```

## 🗄️ Base de données

### Table room_images

```sql
CREATE TABLE room_images (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  room_id         BIGINT UNSIGNED NOT NULL,
  image_path      VARCHAR(255) NOT NULL,
  thumbnail_path  VARCHAR(255),
  is_primary      TINYINT(1) DEFAULT 0,
  sort_order      INT DEFAULT 0,
  caption         VARCHAR(255),
  caption_en      VARCHAR(255),
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP,
  
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_primary (room_id, is_primary),
  INDEX idx_room_sort (room_id, sort_order)
);
```

## 🎨 Captures d'écran

### Dashboard Propriétaire
- Widget de statistiques des chambres
- Taux d'activation visuel
- Alertes pour chambres sans images

### Gestion des chambres
- Liste avec statut visuel (actif/inactif)
- Compteur d'images (X / 3 min)
- Actions rapides (modifier, gérer images, supprimer)

### Upload d'images
- Drag & drop multiple
- Grid d'affichage
- Définir image principale
- Suppression protégée

### Sélection de chambre
- Carousel d'images interactif
- Détails complets (capacité, prix, équipements)
- Comparaison visuelle facile

## ⚙️ Configuration

### Backend (.env)

```env
FILESYSTEM_DISK=public
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci
```

## 🔍 Dépannage

### Erreur : Table 'room_images' doesn't exist

```bash
mysql -u user -p database < backend/database/sql/create_room_images_table.sql
```

### Images ne s'affichent pas

```bash
cd backend
php artisan storage:link
chmod -R 775 storage/app/public
```

### Erreur 500 sur l'API

```bash
tail -f backend/storage/logs/laravel.log
```

### Frontend ne compile pas

```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

## 📈 Statistiques

### Code
- **Backend** : 9 fichiers, ~800 lignes
- **Frontend** : 11 fichiers, ~1500 lignes
- **Documentation** : 11 fichiers, ~3000 lignes
- **Total** : 31 fichiers

### Fonctionnalités
- ✅ Upload multiple d'images
- ✅ Validation (min 3 images)
- ✅ Activation automatique
- ✅ Image principale
- ✅ Réorganisation des images
- ✅ Statistiques détaillées
- ✅ Interface responsive
- ✅ Sécurité (auth, validation)

## 🚨 Important

### Avant le déploiement
- [ ] Faire un backup de la base de données
- [ ] Tester en local
- [ ] Vérifier les variables d'environnement
- [ ] Lire DEPLOY_ROOM_SYSTEM.md

### Après le déploiement
- [ ] Vérifier la table room_images
- [ ] Tester l'API
- [ ] Tester l'interface propriétaire
- [ ] Tester la réservation
- [ ] Vérifier les statistiques
- [ ] Surveiller les logs

## 🤝 Support

En cas de problème :
1. Consulter la documentation
2. Vérifier les logs (backend + frontend)
3. Vérifier la base de données
4. Utiliser la checklist de déploiement

## 📝 Changelog

### Version 1.0 (2026-01-21)
- ✅ Système complet de gestion des chambres
- ✅ Upload multiple d'images
- ✅ Statistiques dans les dashboards
- ✅ Interface complète pour propriétaires
- ✅ Sélection visuelle pour voyageurs
- ✅ Documentation complète

## 🎯 Prochaines étapes (optionnel)

- [ ] Compression automatique des images
- [ ] Génération de thumbnails
- [ ] Support WEBP
- [ ] Watermark sur les images
- [ ] Galerie lightbox améliorée
- [ ] Filtres avancés
- [ ] Analytics des images

## 📞 Contact

Pour toute question sur ce système, consulter la documentation complète dans le dossier racine du projet.

---

**Version** : 1.0  
**Date** : 2026-01-21  
**Statut** : ✅ Production Ready

**Développé avec** : Laravel 11, Next.js 14, TypeScript, TailwindCSS
