# Guide de déploiement - Système de gestion des chambres

## 📋 Vue d'ensemble

Ce guide vous accompagne dans le déploiement complet du nouveau système de gestion des chambres avec images.

## 🎯 Composants à déployer

### Backend
- ✅ Table `room_images` (migration ou SQL)
- ✅ Modèle `RoomImage.php`
- ✅ Routes API pour les images
- ✅ Contrôleur `RoomController` (mis à jour)
- ✅ Contrôleur `AnalyticsController` (mis à jour)

### Frontend
- ✅ Composants de chambres (`RoomCard`, `RoomList`)
- ✅ Composant de statistiques (`RoomStatsCard`)
- ✅ Pages de gestion des chambres (4 nouvelles pages)
- ✅ Dashboards mis à jour (host & admin)
- ✅ Formulaire de réservation amélioré

## 🚀 Déploiement étape par étape

### Étape 1 : Préparer le backend

```bash
cd backend

# Option A : Via migration Laravel (recommandé)
php artisan migrate

# Option B : Via SQL direct
# Copier le contenu de database/sql/create_room_images_table.sql
# et l'exécuter dans phpMyAdmin ou MySQL CLI
```

### Étape 2 : Déployer le backend

```bash
cd backend

# Utiliser le script de déploiement existant
./deploy.sh

# Ou manuellement
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@72.62.16.236:/chemin/vers/backend/

ssh root@72.62.16.236
cd /chemin/vers/backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan migrate --force
```

### Étape 3 : Déployer le frontend

```bash
cd frontend

# Utiliser le script de déploiement du système de chambres
./deploy-room-system.sh root@72.62.16.236

# Ce script va :
# 1. Créer un backup
# 2. Transférer tous les nouveaux fichiers
# 3. Construire l'application
# 4. Redémarrer PM2
```

### Étape 4 : Vérification

```bash
# Sur le serveur
ssh root@72.62.16.236

# Vérifier la table
mysql -u user -p database_name -e "DESCRIBE room_images;"

# Vérifier PM2
pm2 status
pm2 logs monbeaupays-frontend --lines 50

# Tester l'API
curl -H "Authorization: Bearer TOKEN" https://apimonbeaupays.loyerpay.ci/api/analytics/host
```

## 📁 Fichiers déployés

### Backend (nouveaux/modifiés)
```
backend/
├── database/
│   ├── migrations/
│   │   └── 2026_01_12_100001_create_room_images_table.php ✅
│   └── sql/
│       └── create_room_images_table.sql ✅
├── app/
│   ├── Models/
│   │   ├── RoomImage.php ✅ NOUVEAU
│   │   └── Room.php ⚠️ MODIFIÉ
│   └── Http/Controllers/
│       ├── RoomController.php ⚠️ MODIFIÉ
│       └── AnalyticsController.php ⚠️ MODIFIÉ
└── routes/
    └── api.php ⚠️ MODIFIÉ
```

### Frontend (nouveaux/modifiés)
```
frontend/
├── components/
│   ├── room/
│   │   ├── RoomCard.tsx ✅ NOUVEAU
│   │   └── RoomList.tsx ✅ NOUVEAU
│   ├── dashboard/
│   │   └── RoomStatsCard.tsx ✅ NOUVEAU
│   └── booking/
│       └── EnhancedBookingForm.tsx ⚠️ MODIFIÉ
└── app/dashboard/host/accommodations/[id]/
    ├── page.tsx ⚠️ MODIFIÉ
    └── rooms/
        ├── page.tsx ✅ NOUVEAU
        ├── new/
        │   └── page.tsx ✅ NOUVEAU
        └── [roomId]/
            ├── images/
            │   └── page.tsx ✅ NOUVEAU
            └── edit/
                └── page.tsx ✅ NOUVEAU
```

## 🔄 Script de déploiement rapide

```bash
#!/bin/bash
# deploy-all.sh - Déploiement complet

echo "🚀 Déploiement complet du système de chambres"

# Backend
cd backend
echo "📦 Déploiement backend..."
php artisan migrate --force
./deploy.sh

# Frontend
cd ../frontend
echo "🎨 Déploiement frontend..."
./deploy-room-system.sh root@72.62.16.236

echo "✅ Déploiement terminé !"
```

## 🧪 Tests post-déploiement

### 1. Test Backend
```bash
# Vérifier la table
curl -X GET https://apimonbeaupays.loyerpay.ci/api/accommodations/1/rooms

# Vérifier les statistiques
curl -H "Authorization: Bearer TOKEN" \
     https://apimonbeaupays.loyerpay.ci/api/analytics/host
```

### 2. Test Frontend

**À tester manuellement :**
- [ ] Se connecter en tant que propriétaire
- [ ] Accéder au dashboard host
- [ ] Vérifier que les statistiques de chambres s'affichent
- [ ] Cliquer sur un établissement > Chambres
- [ ] Créer une nouvelle chambre
- [ ] Uploader 3 images minimum
- [ ] Vérifier l'activation automatique
- [ ] Tester la sélection de chambre dans le booking

**À tester en tant qu'admin :**
- [ ] Se connecter en tant qu'admin
- [ ] Vérifier les statistiques globales des chambres
- [ ] Vérifier le nombre de chambres sans images

## ⚠️ Points d'attention

### 1. Base de données
- **Important** : Faire un backup avant d'exécuter la migration
- Vérifier que la table `rooms` existe déjà
- Vérifier les permissions de l'utilisateur MySQL

### 2. Stockage
```bash
# Vérifier le lien symbolique storage
php artisan storage:link

# Vérifier les permissions
chmod -R 775 storage/app/public
```

### 3. CORS
Si des erreurs CORS apparaissent, vérifier `backend/config/cors.php`

### 4. PM2
```bash
# Vérifier PM2
pm2 status

# Voir les logs en temps réel
pm2 logs monbeaupays-frontend
pm2 logs monbeaupays-backend

# Redémarrer si nécessaire
pm2 restart all
```

## 🐛 Dépannage

### Erreur : Table 'room_images' doesn't exist
```bash
# Exécuter la migration
php artisan migrate --force

# Ou via SQL
mysql -u user -p database < backend/database/sql/create_room_images_table.sql
```

### Erreur : Cannot find module 'components/room/RoomCard'
```bash
# Rebuild le frontend
cd frontend
npm run build
pm2 restart monbeaupays-frontend
```

### Erreur : 500 sur /api/analytics/host
```bash
# Vérifier les logs Laravel
tail -f backend/storage/logs/laravel.log

# Vérifier la table
mysql -u user -p -e "SELECT COUNT(*) FROM room_images;"
```

### Images ne s'affichent pas
```bash
# Vérifier le storage link
ls -la backend/public/storage

# Recréer si nécessaire
cd backend
php artisan storage:link
```

## 📊 Monitoring post-déploiement

```bash
# Logs backend
tail -f /var/www/backend/storage/logs/laravel.log

# Logs frontend
pm2 logs monbeaupays-frontend

# Logs nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🎉 Checklist finale

- [ ] Table `room_images` créée sur production
- [ ] Backend déployé et redémarré
- [ ] Frontend déployé et rebuild
- [ ] PM2 redémarré
- [ ] Tests API réussis
- [ ] Dashboard host affiche les stats de chambres
- [ ] Dashboard admin affiche les stats de chambres
- [ ] Création de chambre fonctionne
- [ ] Upload d'images fonctionne
- [ ] Sélection de chambre dans booking fonctionne
- [ ] Pas d'erreur dans les logs

## 📞 Support

En cas de problème :
1. Consulter les logs (backend + frontend + nginx)
2. Vérifier la base de données
3. Vérifier les permissions des fichiers
4. Consulter les guides :
   - `INSTALLATION_ROOM_SYSTEM.md`
   - `ROOM_MANAGEMENT_SUMMARY.md`
   - `SQL_ROOM_IMAGES_README.md`

## 🔄 Rollback

Si problème critique :

```bash
# Restaurer le backup frontend
ssh root@72.62.16.236
cd /var/www/monbeaupays
tar -xzf backup_before_rooms_YYYYMMDD_HHMMSS.tar.gz
npm run build
pm2 restart monbeaupays-frontend

# Rollback migration backend
php artisan migrate:rollback --step=1
```

---

**Version:** 1.0  
**Date:** 2026-01-21  
**Testé sur:** Ubuntu 20.04, PM2, Nginx, MySQL 8.0
