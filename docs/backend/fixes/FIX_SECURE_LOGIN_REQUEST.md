# Correction : SecureLoginRequest manquant

Le fichier `SecureLoginRequest.php` n'existe pas sur le serveur backend. Il faut le téléverser.

## 🚀 Solution

### Option 1 : Téléverser uniquement le fichier manquant

```bash
# Depuis votre machine locale
cd /Users/lkmdigital/monbeaupays.com/backend

# Téléverser le fichier
scp app/Http/Requests/SecureLoginRequest.php root@SERVEUR_BACKEND:/chemin/vers/backend/app/Http/Requests/SecureLoginRequest.php
```

### Option 2 : Téléverser tous les fichiers Requests

```bash
# Depuis votre machine locale
cd /Users/lkmdigital/monbeaupays.com/backend

# Téléverser tous les fichiers Requests
rsync -avz app/Http/Requests/ root@SERVEUR_BACKEND:/chemin/vers/backend/app/Http/Requests/
```

### Option 3 : Utiliser le script de déploiement backend

```bash
cd /Users/lkmdigital/monbeaupays.com/backend
./deploy.sh
```

## ⚙️ Après le téléversement

Sur le serveur backend :

```bash
# Vérifier que le fichier existe
ls -la app/Http/Requests/SecureLoginRequest.php

# Vider le cache Laravel
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Vérifier que la classe est trouvée
php artisan tinker
>>> class_exists('App\Http\Requests\SecureLoginRequest');
# Doit retourner: true
```

## 🔍 Vérification

Testez à nouveau la connexion depuis le frontend. L'erreur 500 devrait être résolue.

## 📝 Note

Si vous ne connaissez pas le chemin exact du backend sur le serveur, vous pouvez le trouver avec :

```bash
# Sur le serveur backend
find /var/www -name "artisan" 2>/dev/null
# ou
find /home -name "artisan" 2>/dev/null
```

