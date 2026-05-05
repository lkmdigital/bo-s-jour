# ✅ Checklist de déploiement - Système de chambres

**Date :** _________________  
**Par :** _________________

---

## 🔴 AVANT DE COMMENCER

- [ ] ✅ Backup de la base de données effectué
- [ ] ✅ Backup du code frontend effectué
- [ ] ✅ Backup du code backend effectué
- [ ] ✅ Environnement de production accessible
- [ ] ✅ Accès SSH au serveur
- [ ] ✅ Accès à la base de données

---

## 📦 BACKEND - Base de données

### Option A : Migration Laravel
```bash
cd backend
php artisan migrate --force
```
- [ ] ✅ Migration exécutée sans erreur
- [ ] ✅ Table `room_images` créée
- [ ] ✅ Vérification : `mysql> DESCRIBE room_images;`

### Option B : SQL Direct
```bash
mysql -u u698699576_paysuser -p u698699576_paysbase < backend/database/sql/create_room_images_table.sql
```
- [ ] ✅ Script SQL exécuté sans erreur
- [ ] ✅ Table `room_images` visible dans phpMyAdmin
- [ ] ✅ Vérification des 3 index créés

---

## 📦 BACKEND - Code

### Vérification des fichiers
- [ ] ✅ `app/Models/RoomImage.php` présent
- [ ] ✅ `app/Models/Room.php` modifié (relations images)
- [ ] ✅ `app/Http/Controllers/RoomController.php` modifié
- [ ] ✅ `app/Http/Controllers/AnalyticsController.php` modifié
- [ ] ✅ `routes/api.php` modifié (routes images)

### Déploiement
```bash
cd backend
./deploy.sh
```
- [ ] ✅ Fichiers transférés
- [ ] ✅ Composer install OK
- [ ] ✅ Cache config OK
- [ ] ✅ Cache routes OK

### Tests API
```bash
# Test 1 : Liste des chambres
curl https://apimonbeaupays.loyerpay.ci/api/accommodations/1/rooms
```
- [ ] ✅ Réponse 200 OK
- [ ] ✅ Champs `images` et `primaryImage` présents

```bash
# Test 2 : Statistiques host
curl -H "Authorization: Bearer TOKEN" \
     https://apimonbeaupays.loyerpay.ci/api/analytics/host
```
- [ ] ✅ Réponse 200 OK
- [ ] ✅ Champ `room_stats` présent

```bash
# Test 3 : Statistiques admin
curl -H "Authorization: Bearer TOKEN" \
     https://apimonbeaupays.loyerpay.ci/api/analytics/admin
```
- [ ] ✅ Réponse 200 OK
- [ ] ✅ Champ `room_stats` dans `stats`

---

## 🎨 FRONTEND - Code

### Vérification des fichiers
- [ ] ✅ `components/room/RoomCard.tsx` présent
- [ ] ✅ `components/room/RoomList.tsx` présent
- [ ] ✅ `components/dashboard/RoomStatsCard.tsx` présent
- [ ] ✅ `app/dashboard/host/accommodations/[id]/rooms/page.tsx` présent
- [ ] ✅ `app/dashboard/host/accommodations/[id]/rooms/new/page.tsx` présent
- [ ] ✅ `app/dashboard/host/accommodations/[id]/rooms/[roomId]/images/page.tsx` présent
- [ ] ✅ `app/dashboard/host/accommodations/[id]/rooms/[roomId]/edit/page.tsx` présent
- [ ] ✅ `app/dashboard/host/page.tsx` modifié
- [ ] ✅ `app/dashboard/admin/page.tsx` modifié

### Build local (optionnel mais recommandé)
```bash
cd frontend
npm install
npm run build
```
- [ ] ✅ Build réussi sans erreur
- [ ] ✅ Pas d'erreur TypeScript
- [ ] ✅ Pas d'erreur ESLint

### Déploiement
```bash
cd frontend
./deploy-room-system.sh root@72.62.16.236
```
- [ ] ✅ Backup créé sur le serveur
- [ ] ✅ Fichiers transférés
- [ ] ✅ npm install OK
- [ ] ✅ npm run build OK
- [ ] ✅ PM2 redémarré

---

## 🧪 TESTS FRONTEND - Interface

### Dashboard Propriétaire
```
URL: https://monbeaupays.loyerpay.ci/dashboard/host
```
- [ ] ✅ Page charge sans erreur
- [ ] ✅ Widget "Statistiques des chambres" visible
- [ ] ✅ Compteurs affichés (total, actives, inactives)
- [ ] ✅ Alerte "nécessitant images" visible (si applicable)

### Gestion des chambres
```
URL: https://monbeaupays.loyerpay.ci/dashboard/host/accommodations/1/rooms
```
- [ ] ✅ Page "Chambres" accessible depuis établissement
- [ ] ✅ Liste des chambres affichée
- [ ] ✅ Bouton "Ajouter une chambre" visible
- [ ] ✅ Compteur d'images visible (X / 3 min)
- [ ] ✅ Statut (actif/inactif) visible

### Création de chambre
```
URL: https://monbeaupays.loyerpay.ci/dashboard/host/accommodations/1/rooms/new
```
- [ ] ✅ Formulaire de création accessible
- [ ] ✅ Tous les champs visibles
- [ ] ✅ Validation fonctionne
- [ ] ✅ Redirection vers gestion images après création

### Gestion des images
```
URL: https://monbeaupays.loyerpay.ci/dashboard/host/accommodations/1/rooms/1/images
```
- [ ] ✅ Page de gestion images accessible
- [ ] ✅ Zone drag & drop visible
- [ ] ✅ Upload d'images fonctionne
- [ ] ✅ Images affichées en grid
- [ ] ✅ Bouton "Définir comme principale" fonctionne
- [ ] ✅ Suppression d'image fonctionne
- [ ] ✅ Protection minimum 3 images active
- [ ] ✅ Message d'activation automatique après 3 images

### Dashboard Admin
```
URL: https://monbeaupays.loyerpay.ci/dashboard/admin
```
- [ ] ✅ Page charge sans erreur
- [ ] ✅ Widget "Statistiques des chambres" visible
- [ ] ✅ Statistiques globales affichées
- [ ] ✅ Total d'images uploadées visible

### Réservation
```
URL: https://monbeaupays.loyerpay.ci/accommodations/1
```
- [ ] ✅ Chambres visibles dans le formulaire de réservation
- [ ] ✅ Images des chambres affichées
- [ ] ✅ Carousel d'images fonctionne
- [ ] ✅ Sélection de chambre fonctionne
- [ ] ✅ Réservation avec chambre spécifique fonctionne

---

## 🔍 VÉRIFICATIONS TECHNIQUES

### PM2
```bash
pm2 status
```
- [ ] ✅ monbeaupays-frontend : status `online`
- [ ] ✅ Pas d'erreur dans `pm2 logs monbeaupays-frontend`

### Logs Backend
```bash
tail -f backend/storage/logs/laravel.log
```
- [ ] ✅ Pas d'erreur critique
- [ ] ✅ Pas d'erreur SQL

### Logs Nginx
```bash
tail -f /var/log/nginx/error.log
```
- [ ] ✅ Pas d'erreur 500
- [ ] ✅ Pas d'erreur 404 sur les nouvelles routes

### Base de données
```sql
-- Vérifier les enregistrements
SELECT COUNT(*) FROM room_images;

-- Vérifier les chambres
SELECT 
    r.id, 
    r.name, 
    COUNT(ri.id) as image_count,
    r.is_active
FROM rooms r
LEFT JOIN room_images ri ON r.id = ri.room_id
GROUP BY r.id, r.name, r.is_active;
```
- [ ] ✅ Requêtes exécutées sans erreur
- [ ] ✅ Données cohérentes

---

## 🎯 TESTS UTILISATEURS

### En tant que propriétaire
1. [ ] ✅ Connexion réussie
2. [ ] ✅ Voir le dashboard avec stats chambres
3. [ ] ✅ Accéder à un établissement
4. [ ] ✅ Cliquer sur "Chambres" (nouveau lien)
5. [ ] ✅ Créer une nouvelle chambre
6. [ ] ✅ Uploader 3 images
7. [ ] ✅ Vérifier activation automatique
8. [ ] ✅ Modifier la chambre
9. [ ] ✅ Définir image principale
10. [ ] ✅ Retour au dashboard : stats mises à jour

### En tant qu'admin
1. [ ] ✅ Connexion réussie
2. [ ] ✅ Voir dashboard admin avec stats chambres
3. [ ] ✅ Vérifier les statistiques globales
4. [ ] ✅ Vérifier le nombre de chambres sans images

### En tant que voyageur
1. [ ] ✅ Accéder à un établissement
2. [ ] ✅ Voir les chambres disponibles
3. [ ] ✅ Voir le carousel d'images
4. [ ] ✅ Sélectionner une chambre
5. [ ] ✅ Compléter la réservation

---

## 📱 TESTS RESPONSIVE

### Mobile
- [ ] ✅ Dashboard host responsive
- [ ] ✅ Liste chambres responsive
- [ ] ✅ Upload images responsive
- [ ] ✅ Sélection chambre dans booking responsive

### Tablet
- [ ] ✅ Tous les composants s'affichent correctement

---

## 🚨 ROLLBACK (en cas de problème)

### Frontend
```bash
ssh root@72.62.16.236
cd /var/www/monbeaupays
tar -xzf backup_before_rooms_YYYYMMDD_HHMMSS.tar.gz
npm run build
pm2 restart monbeaupays-frontend
```
- [ ] Rollback frontend effectué

### Backend
```bash
php artisan migrate:rollback --step=1
```
- [ ] Rollback migration effectué

---

## ✅ VALIDATION FINALE

### Checklist globale
- [ ] ✅ Table `room_images` créée et fonctionnelle
- [ ] ✅ API backend répond correctement
- [ ] ✅ Frontend déployé et fonctionnel
- [ ] ✅ PM2 stable
- [ ] ✅ Pas d'erreur dans les logs
- [ ] ✅ Dashboard host affiche stats chambres
- [ ] ✅ Dashboard admin affiche stats chambres
- [ ] ✅ Création de chambre fonctionne
- [ ] ✅ Upload d'images fonctionne
- [ ] ✅ Sélection dans booking fonctionne
- [ ] ✅ Tests utilisateurs réussis
- [ ] ✅ Tests responsive OK

### Performance
- [ ] ✅ Page dashboard charge en < 2s
- [ ] ✅ Upload d'image < 5s
- [ ] ✅ Pas de ralentissement notable

### Sécurité
- [ ] ✅ Authentification requise pour gestion chambres
- [ ] ✅ Validation des fichiers uploadés
- [ ] ✅ Protection suppression (min 3 images)
- [ ] ✅ HTTPS actif partout

---

## 📊 MÉTRIQUES POST-DÉPLOIEMENT

**À surveiller pendant 24h :**
- [ ] Taux d'erreur API < 1%
- [ ] Temps de réponse API < 500ms
- [ ] Uptime frontend > 99.9%
- [ ] Pas d'erreur 500 dans Nginx

---

## 📝 NOTES

**Problèmes rencontrés :**
_______________________________________________________
_______________________________________________________
_______________________________________________________

**Solutions appliquées :**
_______________________________________________________
_______________________________________________________
_______________________________________________________

**Points à améliorer :**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## ✅ DÉPLOIEMENT VALIDÉ

**Signature :** _________________  
**Date :** _________________  
**Heure :** _________________  

**Statut final :** 🟢 PRODUCTION

---

**Documentation complète :** `DEPLOY_ROOM_SYSTEM.md`  
**Support :** `INSTALLATION_ROOM_SYSTEM.md`
