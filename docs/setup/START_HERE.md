# 🚀 SYSTÈME DE CHAMBRES - COMMENCEZ ICI

## ⚡ Déploiement ultra-rapide

```bash
# Commande unique pour tout déployer
./deploy-room-system-complete.sh
```

## 📖 Documentation

### Pour déployer MAINTENANT
1. **QUICK_DEPLOY.md** ← Commencez par ici !
2. **CHECKLIST_DEPLOIEMENT_CHAMBRES.md** ← Cochez au fur et à mesure

### Pour comprendre le système
3. **README_SYSTEME_CHAMBRES.md** ← Vue d'ensemble complète

### Pour une installation détaillée
4. **DEPLOY_ROOM_SYSTEM.md** ← Guide étape par étape
5. **INSTALLATION_ROOM_SYSTEM.md** ← Installation complète

## 📁 Fichiers critiques

### Backend
- `backend/database/sql/create_room_images_table.sql` ⭐ **À exécuter en PREMIER**
- `backend/app/Models/RoomImage.php`
- `backend/app/Http/Controllers/RoomController.php`
- `backend/app/Http/Controllers/AnalyticsController.php`

### Frontend
- `frontend/components/dashboard/RoomStatsCard.tsx` ⭐ **Stats dans les dashboards**
- `frontend/app/dashboard/host/accommodations/[id]/rooms/[roomId]/images/page.tsx` ⭐ **Upload images**
- `frontend/deploy-room-system.sh` ⭐ **Script de déploiement**

## ✅ Checklist ultra-rapide

- [ ] Table `room_images` créée
- [ ] Backend déployé
- [ ] Frontend déployé
- [ ] Dashboard affiche les stats
- [ ] Upload d'images fonctionne

## 🆘 En cas de problème

1. Vérifier les logs : `tail -f backend/storage/logs/laravel.log`
2. Vérifier PM2 : `pm2 logs monbeaupays-frontend`
3. Consulter : **DEPLOY_ROOM_SYSTEM.md**

## 📞 Support rapide

| Problème | Solution |
|----------|----------|
| Table manquante | `mysql ... < create_room_images_table.sql` |
| API 500 | Vérifier logs Laravel |
| Frontend ne build pas | `npm install && npm run build` |
| Images invisibles | `php artisan storage:link` |

---

## 🎯 COMMANDES ESSENTIELLES

```bash
# Base de données
mysql -u u698699576_paysuser -p u698699576_paysbase < backend/database/sql/create_room_images_table.sql

# Frontend
cd frontend && ./deploy-room-system.sh root@72.62.16.236

# Vérifier
curl https://apimonbeaupays.loyerpay.ci/api/accommodations/1/rooms
```

---

**IMPORTANT** : Lisez **QUICK_DEPLOY.md** avant de commencer !

**VERSION** : 1.0 | **DATE** : 2026-01-21 | **STATUS** : ✅ Production Ready
