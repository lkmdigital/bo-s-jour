# Diagnostic Erreur 500 - Backend API

L'erreur 500 (Internal Server Error) indique un problème côté serveur backend. Voici comment diagnostiquer et corriger.

## 🔍 Diagnostic

### 1. Vérifier les logs Laravel

Sur le serveur backend, vérifiez les logs :

```bash
# Se connecter au serveur backend
ssh root@SERVEUR_BACKEND

# Aller dans le dossier backend
cd /chemin/vers/backend

# Voir les dernières erreurs
tail -n 100 storage/logs/laravel.log

# Ou voir les logs en temps réel
tail -f storage/logs/laravel.log
```

### 2. Vérifier les logs Nginx/PHP-FPM

```bash
# Logs Nginx
tail -n 50 /var/log/nginx/error.log

# Logs PHP-FPM
tail -n 50 /var/log/php8.2-fpm.log
# ou selon votre version PHP
```

### 3. Tester l'endpoint directement

```bash
# Tester la route de login
curl -X POST https://apimonbeaupays.loyerpay.ci/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v
```

## 🔧 Solutions Courantes

### Problème 1 : Erreur de base de données

**Symptômes :** Erreurs dans les logs mentionnant "SQLSTATE" ou "Connection refused"

**Solution :**
```bash
# Vérifier la connexion MySQL
mysql -u VOTRE_USER -p -e "SELECT 1"

# Vérifier les variables d'environnement
cat .env | grep DB_

# Tester la connexion depuis Laravel
php artisan tinker
>>> DB::connection()->getPdo();
```

### Problème 2 : Permissions de fichiers

**Symptômes :** Erreurs "Permission denied" dans les logs

**Solution :**
```bash
# Corriger les permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

### Problème 3 : Cache Laravel corrompu

**Solution :**
```bash
# Vider tous les caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Recréer les caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Problème 4 : Erreur dans le code

**Symptômes :** Erreur spécifique dans les logs (ex: "Call to undefined method")

**Solution :**
- Vérifier les logs pour l'erreur exacte
- Vérifier que le code est à jour
- Vérifier les dépendances Composer

### Problème 5 : Problème de mémoire PHP

**Symptômes :** "Allowed memory size exhausted"

**Solution :**
```bash
# Vérifier la limite de mémoire PHP
php -i | grep memory_limit

# Augmenter dans php.ini si nécessaire
nano /etc/php/8.2/fpm/php.ini
# Modifier: memory_limit = 256M
systemctl restart php8.2-fpm
```

## 📝 Checklist de Diagnostic

- [ ] Logs Laravel vérifiés (`storage/logs/laravel.log`)
- [ ] Logs Nginx vérifiés (`/var/log/nginx/error.log`)
- [ ] Logs PHP-FPM vérifiés
- [ ] Connexion base de données fonctionnelle
- [ ] Permissions de fichiers correctes
- [ ] Caches Laravel vidés et recréés
- [ ] Configuration PHP correcte (mémoire, extensions)
- [ ] Code backend à jour
- [ ] Dépendances Composer installées

## 🔍 Commandes Utiles

```bash
# Voir les dernières erreurs
tail -n 100 storage/logs/laravel.log | grep -A 10 "ERROR"

# Vérifier les routes
php artisan route:list | grep login

# Tester la connexion DB
php artisan tinker
>>> DB::connection()->getPdo();

# Vérifier la configuration
php artisan config:show

# Vérifier les permissions
ls -la storage/logs
ls -la bootstrap/cache
```

## 🚨 Erreurs Spécifiques

### "Class not found"
```bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

### "SQLSTATE[HY000] [2002] Connection refused"
- Vérifier que MySQL tourne : `systemctl status mysql`
- Vérifier les credentials dans `.env`

### "The stream or file could not be opened"
- Vérifier les permissions : `chmod -R 775 storage`
- Vérifier que le dossier existe : `mkdir -p storage/logs`

## 📞 Support

Si le problème persiste après ces vérifications, partagez :
1. Les dernières lignes de `storage/logs/laravel.log`
2. L'erreur exacte dans la console du navigateur
3. La requête qui échoue (méthode, URL, données)

