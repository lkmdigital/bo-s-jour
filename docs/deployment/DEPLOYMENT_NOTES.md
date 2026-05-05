# Notes de déploiement - Statistiques par établissement

## Fichiers modifiés

### Backend
1. **`backend/routes/api.php`** (ligne 119)
   - Ajout de la route : `GET /api/analytics/host/accommodation/{id}`
   - Route placée dans le groupe `auth:sanctum` avec middleware `role:host`

2. **`backend/app/Http/Controllers/AnalyticsController.php`**
   - Ajout de la méthode `accommodationStats(Request $request, $accommodationId)`
   - Méthode complète avec toutes les statistiques par établissement

### Frontend
1. **`frontend/app/dashboard/host/page.tsx`**
   - Ajout de la section "Revenus par établissement" avec cartes cliquables
   - Ajout de la section "Statistiques détaillées par établissement" avec tableau
   - Modification de la section "Top hébergements" pour rendre les éléments cliquables

2. **`frontend/app/dashboard/host/accommodations/[id]/stats/page.tsx`** (NOUVEAU FICHIER)
   - Page complète pour afficher les statistiques détaillées d'un établissement

## Commandes à exécuter sur le serveur de production

```bash
# 1. Créer la table cache si elle n'existe pas
php artisan cache:table
php artisan migrate

# 2. Vider tous les caches
php artisan route:clear
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# 3. Vérifier que la route est bien enregistrée
php artisan route:list | grep "accommodation"

# 4. (Optionnel) Optimiser pour la production
php artisan config:cache
php artisan route:cache
```

## Note importante

Si vous obtenez l'erreur `Table 'monbeaupays.cache' doesn't exist`, exécutez d'abord :
```bash
php artisan cache:table
php artisan migrate
```

Cela créera les tables `cache` et `cache_locks` nécessaires pour le système de cache de Laravel.

## Vérification

Après déploiement, vérifier que la route est accessible :
- URL : `GET /api/analytics/host/accommodation/{id}`
- Headers requis : `Authorization: Bearer {token}`
- Middleware : `auth:sanctum`, `role:host`

## Test

1. Se connecter en tant qu'hôte
2. Aller sur `/dashboard/host`
3. Cliquer sur un établissement dans "Top hébergements" ou "Revenus par établissement"
4. Vérifier que la page de statistiques s'affiche correctement

