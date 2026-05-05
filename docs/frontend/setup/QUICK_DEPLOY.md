# 🚀 Déploiement Rapide - Système de chambres

## 📝 Commandes rapides

### Déploiement complet (recommandé)

```bash
# Depuis le dossier frontend
./deploy-room-system.sh root@72.62.16.236
```

### Déploiement backend uniquement

```bash
cd backend

# Créer la table room_images
mysql -u u698699576_paysuser -p u698699576_paysbase < database/sql/create_room_images_table.sql

# Ou via migration
php artisan migrate --force

# Déployer
./deploy.sh
```

### Déploiement frontend uniquement

```bash
cd frontend
./deploy-room-system.sh root@72.62.16.236
```

## ✅ Checklist rapide

Avant de déployer :
- [ ] Fichier SQL testé localement
- [ ] Backend testé en local
- [ ] Frontend compilé sans erreur (`npm run build`)
- [ ] Variables d'environnement vérifiées

Après déploiement :
- [ ] Table `room_images` existe en production
- [ ] API répond : `GET /api/accommodations/{id}/rooms`
- [ ] Dashboard affiche les stats de chambres
- [ ] Upload d'images fonctionne
- [ ] Pas d'erreur dans `pm2 logs`

## 🎯 URLs à tester

```bash
# API Backend
https://apimonbeaupays.loyerpay.ci/api/accommodations/1/rooms
https://apimonbeaupays.loyerpay.ci/api/analytics/host

# Frontend
https://monbeaupays.loyerpay.ci/dashboard/host
https://monbeaupays.loyerpay.ci/dashboard/admin
```

## 🐛 Dépannage rapide

### Problème de build
```bash
rm -rf .next
npm install
npm run build
```

### Problème PM2
```bash
pm2 restart monbeaupays-frontend
pm2 logs monbeaupays-frontend --lines 50
```

### Problème de table
```bash
# Vérifier
mysql -u user -p -e "SHOW TABLES LIKE 'room_images';"

# Créer
mysql -u user -p database < backend/database/sql/create_room_images_table.sql
```

## 📞 En cas d'urgence

**Rollback rapide :**
```bash
ssh root@72.62.16.236
cd /var/www/monbeaupays
tar -xzf backup_before_rooms_*.tar.gz
npm run build
pm2 restart monbeaupays-frontend
```

---

Pour plus de détails : **DEPLOY_ROOM_SYSTEM.md**
