# Corriger l’erreur serveur après déploiement

## 0. Trouver l’erreur exacte (à faire en premier)

En SSH sur le serveur, afficher la dernière erreur Laravel :

```bash
ssh root@72.62.31.145
cd /var/www/monbeaupays-backend
tail -150 storage/logs/laravel.log
```

Copiez les dernières lignes (message d’exception + stack trace) pour identifier la cause. Exemples courants :

| Message dans le log | Action |
|--------------------|--------|
| `Table 'xxx.client_credits' doesn't exist` | Exécuter : `php artisan migrate --force` |
| `Column not found: is_non_refundable` | Exécuter : `php artisan migrate --force` |
| `Class "App\...\ClientCredit" not found` | Redéployer le backend (fichiers manquants) puis `composer dump-autoload` |
| `View path not found` | Voir section 4 ci‑dessous |
| `Permission denied` sur `storage/logs/security-*.log` | Voir section 4b (droits storage) — l’inscription ne doit plus renvoyer 500 après correctif en code |

## 1. Vider les caches Laravel (souvent suffisant)

En SSH sur le serveur :

```bash
ssh root@72.62.31.145

cd /var/www/monbeaupays-backend

# Créer le dossier des vues s'il manque (évite "View path not found")
mkdir -p resources/views

# Vider les caches (sans view:clear si vous avez encore l'erreur)
php artisan config:clear
php artisan route:clear
php artisan cache:clear
# php artisan view:clear   # à décommenter seulement si resources/views existe

# Recréer uniquement config + routes (sans view:cache)
php artisan config:cache
php artisan route:cache
```

Puis redémarrer PHP-FPM :

```bash
systemctl restart php8.2-fpm
# ou selon votre config : systemctl restart php-fpm
```

## 2. Voir l’erreur exacte (logs)

Pour savoir pourquoi vous avez une 500 :

```bash
cd /var/www/monbeaupays-backend
tail -100 storage/logs/laravel.log
```

Vérifier aussi les erreurs Nginx/PHP :

```bash
tail -50 /var/log/nginx/error.log
```

## 3. Vérifications rapides

- Fichier `.env` présent et lisible : `ls -la .env`
- Clé d’application : `php artisan tinker --execute="echo config('app.key');"` (doit afficher une clé non vide)
- Connexion BDD : `php artisan migrate:status`
- **Droits sur storage et bootstrap/cache** (obligatoire pour éviter « Permission denied » et erreur 500 à l’inscription) :

```bash
cd /var/www/monbeaupays-backend
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

(Sur certains serveurs l’utilisateur web est `nginx` ou `apache` au lieu de `www-data` — à adapter. Vérifier avec `ps aux | grep -E 'nginx|php-fpm'`.)

## 4. Erreur « View path not found »

Créer le dossier des vues puis vider le cache des vues :

```bash
cd /var/www/monbeaupays-backend
mkdir -p resources/views
php artisan view:clear
```

Si le dossier `resources/` entier a été supprimé, redéployer le backend (le script envoie bien `backend/resources/`). Le fichier `resources/views/.gitkeep` garantit que le dossier views existe après déploiement.

## 5. Vérifications après déploiement (éviter le 500)

À lancer après chaque déploiement backend :

```bash
cd /var/www/monbeaupays-backend
php artisan migrate --force
php artisan config:clear && php artisan route:clear && php artisan config:cache && php artisan route:cache
chmod -R 775 storage bootstrap/cache
systemctl restart php8.2-fpm
```

## 6. Après correction

Tester l’API :

```bash
curl -s https://api.bosejour.ci/api/accommodations | head -200
```

Sur le serveur en local :

```bash
curl -s http://localhost/api/accommodations
```
