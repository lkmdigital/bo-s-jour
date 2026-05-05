# 🚀 Utilisation de update-frontend.sh

## Script mis à jour pour le système de chambres

Le script `update-frontend.sh` a été adapté pour inclure le déploiement complet du système de gestion des chambres.

## ✨ Nouvelles fonctionnalités

### Ajouts par rapport à la version précédente

1. **Vérification des fichiers du système de chambres**
   - Vérifie que tous les composants requis sont présents
   - Liste les fichiers manquants le cas échéant

2. **Création automatique de backup**
   - Backup timestampé avant chaque déploiement
   - Permet un rollback facile en cas de problème

3. **Messages détaillés**
   - Affichage des fichiers de chambres déployés
   - Statistiques des nouvelles fonctionnalités
   - Guide post-déploiement

4. **Vérifications post-déploiement**
   - Vérifie que les composants sont bien déployés
   - Affiche le statut PM2
   - Liste les URLs à tester

## 📋 Utilisation

### Commande basique

```bash
cd frontend
./update-frontend.sh
```

### Avec un serveur différent

```bash
cd frontend
./update-frontend.sh root@VOTRE_IP
```

### Serveur par défaut

Le script utilise maintenant : `root@72.62.16.236`

## 🔄 Étapes du déploiement

Le script exécute 6 étapes principales :

1. **[0/6]** Vérification de la connexion SSH
2. **[0.5/6]** Vérification des fichiers du système de chambres
3. **[0.9/6]** Création d'un backup sur le serveur
4. **[1/6]** Transfert des fichiers
5. **[2/6]** Installation des dépendances
6. **[3/6]** Configuration .env.production
7. **[4/6]** Build de l'application
8. **[5/6]** Redémarrage PM2
9. **[6/6]** Vérifications post-déploiement

## ✅ Fichiers vérifiés

Le script vérifie la présence de ces fichiers critiques :

- `components/room/RoomCard.tsx`
- `components/room/RoomList.tsx`
- `components/dashboard/RoomStatsCard.tsx`
- `app/dashboard/host/accommodations/[id]/rooms/page.tsx`
- `app/dashboard/host/accommodations/[id]/rooms/new/page.tsx`
- `app/dashboard/host/accommodations/[id]/rooms/[roomId]/images/page.tsx`
- `app/dashboard/host/accommodations/[id]/rooms/[roomId]/edit/page.tsx`

## 📊 Après le déploiement

### URLs à tester

1. **Dashboard Host**: https://monbeaupays.loyerpay.ci/dashboard/host
   - Vérifier le widget "Statistiques des chambres"

2. **Dashboard Admin**: https://monbeaupays.loyerpay.ci/dashboard/admin
   - Vérifier les statistiques globales des chambres

3. **Site principal**: https://monbeaupays.loyerpay.ci

### Tests à effectuer

1. Se connecter en tant que propriétaire
2. Vérifier les statistiques des chambres dans le dashboard
3. Créer une nouvelle chambre
4. Uploader 3 images minimum
5. Vérifier l'activation automatique
6. Tester la réservation avec sélection de chambre

## 🔧 Commandes utiles post-déploiement

```bash
# Voir les logs
ssh root@72.62.16.236 'pm2 logs monbeaupays-frontend --lines 50'

# Statut PM2
ssh root@72.62.16.236 'pm2 status'

# Redémarrer
ssh root@72.62.16.236 'pm2 restart monbeaupays-frontend'

# Restaurer le backup (en cas de problème)
ssh root@72.62.16.236 'cd /var/www/monbeaupays && tar -xzf backup_frontend_YYYYMMDD_HHMMSS.tar.gz'
```

## 🚨 En cas de problème

### Erreur lors du transfert

```bash
# Vérifier la connexion SSH
ssh root@72.62.16.236

# Vérifier l'espace disque
ssh root@72.62.16.236 'df -h'
```

### Erreur lors du build

```bash
# Se connecter et build manuellement
ssh root@72.62.16.236
cd /var/www/monbeaupays
rm -rf .next node_modules
npm install
npm run build
```

### Fichiers manquants

Si le script indique des fichiers manquants :
1. Vérifiez que vous êtes dans le bon dossier
2. Vérifiez que tous les fichiers du système de chambres ont été créés
3. Consultez `FICHIERS_DEPLOIEMENT_CHAMBRES.txt` pour la liste complète

## 🔄 Rollback

Si quelque chose ne fonctionne pas :

```bash
# Option 1 : Utiliser le backup créé par le script
ssh root@72.62.16.236
cd /var/www/monbeaupays
tar -xzf backup_frontend_YYYYMMDD_HHMMSS.tar.gz
npm run build
pm2 restart monbeaupays-frontend

# Option 2 : Utiliser le backup manuel
ssh root@72.62.16.236
cd /var/www/monbeaupays
tar -xzf backup_before_rooms_*.tar.gz
npm run build
pm2 restart monbeaupays-frontend
```

## 📝 Différences avec deploy-room-system.sh

| Fonctionnalité | update-frontend.sh | deploy-room-system.sh |
|----------------|-------------------|----------------------|
| Scope | Frontend complet | Fichiers système chambres |
| Backup | Automatique | Automatique |
| Exclusions | Plus strict | Ciblé |
| Build | Complet | Complet |
| Vérifications | Pré et post | Post uniquement |

### Quand utiliser quel script ?

- **`update-frontend.sh`** : Déploiement complet du frontend (recommandé)
- **`deploy-room-system.sh`** : Déploiement ciblé (seulement les fichiers de chambres)

## 🎯 Avantages de la version mise à jour

✅ Vérification automatique des fichiers  
✅ Backup avant chaque déploiement  
✅ Messages détaillés et colorés  
✅ Guide post-déploiement intégré  
✅ Rollback facilité  
✅ Compatible avec le système de chambres  

## 📚 Documentation complémentaire

- **DEPLOY_ROOM_SYSTEM.md** - Guide de déploiement complet
- **QUICK_DEPLOY.md** - Déploiement rapide
- **3_COMMANDES.txt** - Les 3 commandes essentielles
- **COPIER_COLLER_ICI.txt** - Commandes prêtes à copier

---

**Version** : 2.0 (avec système de chambres)  
**Dernière mise à jour** : 2026-01-21  
**Testé sur** : Ubuntu 20.04, PM2, Next.js 14
