---
description: Deploy Laravel backend to shared hosting
---

# Déployer le Backend Laravel

## Prérequis
- Accès FTP/SFTP au serveur `loyerpay.ci`
- PHP 8.2+ avec extensions Laravel (mbstring, xml, ctype, json, tokenizer, etc.)

## Étapes

1. **Préparer le build local**
   ```bash
   cd /Users/lkmdigital/monbeaupays.com/backend
   composer install --no-dev --optimize-autoloader
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

2. **Créer l'archive de déploiement**
   ```bash
   tar -czvf deploy.tar.gz --exclude='.git' --exclude='node_modules' --exclude='tests' --exclude='.env' .
   ```

3. **Uploader sur le serveur**
   - Extraire dans le dossier racine du domaine (`/home/u698699576/apimonbeaupays/`)
   - Copier `.env.production.template` en `.env` et remplir `APP_KEY`
   - Générer la clé : `php artisan key:generate`

4. **Configurer les permissions**
   ```bash
   chmod -R 755 storage/
   chmod -R 755 bootstrap/cache/
   ```

5. **Migrations base de données**
   ```bash
   php artisan migrate --force
   ```

6. **Clear caches post-déploiement**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   ```
