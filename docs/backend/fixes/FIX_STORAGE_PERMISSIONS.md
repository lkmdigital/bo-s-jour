# Corriger l'erreur "Unable to create a directory" (upload images)

L'erreur survient quand le serveur web (nginx/apache) n'a pas les droits d'écriture dans `storage/app/public`.

## Sur le serveur (SSH)

À exécuter **à la racine du projet backend** (ex. `/var/www/monbeaupays-backend`) :

```bash
# 1. Créer le lien symbolique storage -> public/storage (si pas déjà fait)
php artisan storage:link

# 2. Créer le répertoire des uploads et donner les bonnes permissions
mkdir -p storage/app/public/accommodations
mkdir -p storage/app/public/accommodations/11

# 3. Propriétaire : utilisateur du serveur web (souvent www-data pour nginx/apache)
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Si vous utilisez un utilisateur différent (ex. deploy ou le user qui lance PHP-FPM) :
# sudo chown -R deploy:www-data storage bootstrap/cache
```

## Vérifier l'utilisateur PHP

Pour savoir sous quel utilisateur PHP exécute les scripts (c'est lui qui doit pouvoir écrire dans `storage`) :

```bash
# Créer un fichier temporaire info.php avec : <?php echo get_current_user() . ' / ' . posix_getpwuid(posix_geteuid())['name'];
php -r "echo get_current_user();"
# ou sur le serveur web :
# dans public/info.php : <?php echo exec('whoami');
```

Puis mettre ce même utilisateur comme propriétaire de `storage` (ou mettre le groupe www-data et chmod 775).

## Résumé rapide

```bash
cd /var/www/monbeaupays-backend
php artisan storage:link
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

Après ces commandes, réessayer l'upload d'images.
