# 🚀 Guide de déploiement - Route Analytics Host Accommodation

## 📋 Problème
La route API `/api/analytics/host/accommodation/{id}` n'existe pas encore sur le serveur de production.

## ✅ Vérification locale
La route existe bien dans le code local :
- **Route** : `GET /api/analytics/host/accommodation/{id}` (ligne 119 de `backend/routes/api.php`)
- **Contrôleur** : `AnalyticsController@accommodationStats`
- **Middleware** : `auth:sanctum`, `role:host`

## 📤 Étapes de déploiement

### 1. Upload des fichiers modifiés sur le serveur

Via FTP/SFTP, uploader les fichiers suivants :

**Backend :**
- `backend/routes/api.php` (ligne 119 contient la nouvelle route)
- `backend/app/Http/Controllers/AnalyticsController.php` (méthode `accommodationStats`)

### 2. Se connecter au serveur via SSH

```bash
ssh votre-utilisateur@votre-serveur.com
cd ~/domains/votre-domaine.com/backend
```

### 3. Exécuter les commandes de déploiement

```bash
# 1. Vider tous les caches (IMPORTANT)
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# 2. Vérifier que la route est bien enregistrée
php artisan route:list | grep "accommodation" | grep "analytics"

# Vous devriez voir :
# GET|HEAD  api/analytics/host/accommodation/{id} AnalyticsController@accommodationStats

# 3. Optimiser pour la production
php artisan config:cache
php artisan route:cache
```

### 4. Vérification

Testez la route avec curl ou Postman :

```bash
# Remplacer {token} par un token d'authentification valide d'un hôte
# Remplacer {id} par l'ID d'un établissement (ex: 1)

curl -X GET "https://apimonbeaupays.loyerpay.ci/api/analytics/host/accommodation/1" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

## 🔍 Dépannage

### Si la route n'apparaît pas après `route:list`

1. Vérifiez que les fichiers ont bien été uploadés :
   ```bash
   cat routes/api.php | grep "accommodationStats"
   cat app/Http/Controllers/AnalyticsController.php | grep "accommodationStats"
   ```

2. Vérifiez les permissions des fichiers :
   ```bash
   ls -la routes/api.php
   ls -la app/Http/Controllers/AnalyticsController.php
   ```

3. Videz à nouveau les caches :
   ```bash
   php artisan route:clear
   php artisan config:clear
   php artisan cache:clear
   ```

### Si vous obtenez une erreur 403 (Forbidden)

- Vérifiez que l'utilisateur a bien le rôle `host`
- Vérifiez que l'établissement appartient à l'hôte connecté

### Si vous obtenez une erreur 404 (Not Found)

- Vérifiez que la route est bien dans le groupe `auth:sanctum`
- Vérifiez que le middleware `role:host` est bien appliqué
- Videz les caches de routes : `php artisan route:clear && php artisan route:cache`

## 📝 Fichiers à déployer

### Backend (obligatoire)
- ✅ `backend/routes/api.php`
- ✅ `backend/app/Http/Controllers/AnalyticsController.php`

### Frontend (optionnel - si vous avez modifié le frontend)
- `frontend/app/dashboard/host/page.tsx`
- `frontend/app/dashboard/host/accommodations/[id]/stats/page.tsx`

## ✅ Checklist de déploiement

- [ ] Fichiers backend uploadés sur le serveur
- [ ] Caches vidés (`route:clear`, `config:clear`, `cache:clear`)
- [ ] Route vérifiée avec `php artisan route:list`
- [ ] Route testée avec curl/Postman
- [ ] Caches optimisés pour la production (`config:cache`, `route:cache`)

## 🎯 Résultat attendu

Après le déploiement, la route devrait être accessible et retourner des statistiques détaillées pour l'établissement :

```json
{
  "accommodation": {...},
  "total_bookings": 10,
  "confirmed_bookings": 8,
  "pending_bookings": 2,
  "total_revenue": 500000,
  "daily_revenue": 50000,
  "weekly_revenue": 150000,
  "monthly_revenue": 300000,
  "revenue_growth": 15.5,
  "monthly_revenue_trend": [...],
  "upcoming_bookings": 3,
  "recent_bookings": [...]
}
```
