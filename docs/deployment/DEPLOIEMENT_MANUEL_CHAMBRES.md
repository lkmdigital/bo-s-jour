# 🚀 Déploiement Manuel - Système de Réservation par Chambre

## ✅ Build terminé avec succès en local

Le frontend a été compilé avec succès. Voici comment déployer manuellement.

---

## 📤 Option 1 : Upload Frontend via FTP (recommandé)

### Étape 1 : Compresser le build

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend
tar -czf next-build-chambres.tar.gz .next/
```

### Étape 2 : Uploader via FTP

1. Connectez-vous à votre serveur via FTP (FileZilla, Cyberduck, etc.)
2. Allez dans le dossier : `/var/www/monbeaupays-frontend/`
3. Uploadez `next-build-chambres.tar.gz`
4. Décompressez sur le serveur :

```bash
cd /var/www/monbeaupays-frontend
tar -xzf next-build-chambres.tar.gz
rm next-build-chambres.tar.gz
```

### Étape 3 : Redémarrer l'application

```bash
pm2 restart monbeaupays-frontend
# ou
pm2 restart all
```

---

## 📤 Option 2 : Upload direct du dossier .next

Via FTP, uploadez **tout le contenu** de :
```
Source: /Users/lkmdigital/monbeaupays.com/frontend/.next/*
Destination: /var/www/monbeaupays-frontend/.next/
```

Puis redémarrez PM2 (voir ci-dessus).

---

## 🔧 Backend - Upload via FTP

### Fichiers à uploader (3 fichiers)

#### 1. RoomController.php
```
Local:    /Users/lkmdigital/monbeaupays.com/backend/app/Http/Controllers/RoomController.php
Serveur:  /public_html/app/Http/Controllers/RoomController.php
```

#### 2. AccommodationController.php
```
Local:    /Users/lkmdigital/monbeaupays.com/backend/app/Http/Controllers/AccommodationController.php
Serveur:  /public_html/app/Http/Controllers/AccommodationController.php
```

#### 3. api.php
```
Local:    /Users/lkmdigital/monbeaupays.com/backend/routes/api.php
Serveur:  /public_html/routes/api.php
```

### Vider le cache Laravel

Après l'upload, accédez à :
```
https://apimonbeaupays.loyerpay.ci/clear-cache.php
```

---

## 🧪 Tests après déploiement

### 1. Test API - Route publique des chambres
```bash
curl https://apimonbeaupays.loyerpay.ci/api/rooms/27
```

**Résultat attendu** : JSON avec les détails de la chambre

### 2. Test Frontend - Liste des chambres
```
1. Ouvrir : https://bosejour.ci/accommodations/10
2. Scroller vers le bas
3. ✅ Voir section "Chambres disponibles"
4. ✅ Cartes des chambres cliquables
```

### 3. Test Frontend - Page de détails
```
1. Cliquer sur "Voir détails" d'une chambre
2. ✅ Page /rooms/27 s'ouvre
3. ✅ Galerie d'images visible
4. ✅ Bouton "Réserver cette chambre" présent
```

### 4. Test Réservation complète
```
1. Page chambre → Cliquer "Réserver cette chambre"
2. ✅ Formulaire pré-rempli avec la chambre
3. Remplir dates et infos
4. Soumettre
5. ✅ Réservation créée avec room_id en base
```

---

## 📊 Vérification base de données

### Vérifier que room_id existe
```sql
DESCRIBE bookings;
-- Doit afficher room_id | bigint unsigned | YES | MUL | NULL
```

### Vérifier une réservation
```sql
SELECT id, accommodation_id, room_id, check_in, check_out 
FROM bookings 
ORDER BY id DESC 
LIMIT 1;
```

---

## 🎯 Nouveaux fichiers créés

### Frontend (nouveaux fichiers dans .next)
- `/app/rooms/[id]/page.tsx` - Page de détails de chambre
- `/app/bookings/new/page.tsx` - Page de nouvelle réservation
- `/components/accommodation/RoomsList.tsx` - Liste des chambres (modifié)

### Backend (fichiers modifiés)
- `RoomController.php` - Méthode `showPublic()` ajoutée
- `AccommodationController.php` - Charge les chambres avec images
- `api.php` - Route `/rooms/{id}` ajoutée

---

## ⚠️ Problèmes courants

### "404 Not Found" sur /rooms/27
**Solution** : Vérifiez que le backend a bien été uploadé et le cache vidé

### "Chambres disponibles" ne s'affiche pas
**Solution** : 
1. Vérifiez que l'établissement a des chambres actives (≥3 images)
2. Hard refresh du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)

### Images 404 dans la galerie
**Solution** : Les images doivent être uploadées et stockées avec des URLs complètes
(Ce problème a déjà été corrigé dans RoomController.php)

---

## 📝 Checklist finale

### Backend ✅
- [ ] RoomController.php uploadé
- [ ] AccommodationController.php uploadé
- [ ] api.php uploadé
- [ ] Cache Laravel vidé
- [ ] Test API `/rooms/27` fonctionne

### Frontend ✅
- [ ] Dossier .next uploadé
- [ ] PM2 redémarré
- [ ] Page /accommodations/10 affiche les chambres
- [ ] Page /rooms/27 fonctionne
- [ ] Bouton "Réserver" redirige correctement

### Fonctionnel ✅
- [ ] Clic sur chambre ouvre la page de détails
- [ ] Galerie d'images fonctionne
- [ ] Lightbox s'ouvre au clic sur image
- [ ] Réservation pré-remplit la chambre
- [ ] Réservation créée avec room_id en BDD

---

## 🆘 Support

Si un problème persiste :

1. **Vérifier les logs Laravel** : `/storage/logs/laravel.log`
2. **Vérifier les logs PM2** : `pm2 logs monbeaupays-frontend`
3. **Tester l'API en direct** : Utilisez Postman ou `curl`

---

**Date** : 2026-01-21  
**Fonctionnalité** : Système de réservation par chambre  
**Status Build** : ✅ Succès (local)  
**Prêt pour déploiement** : ✅ Oui
