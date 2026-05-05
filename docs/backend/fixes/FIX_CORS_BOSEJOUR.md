# Correction CORS pour bosejour.ci

Le backend bloque les requêtes depuis `http://bosejour.ci` car cette origine n'est pas dans la liste des origines autorisées.

## 🔧 Solution

### Sur le serveur backend (où se trouve l'API)

Vous devez ajouter `http://bosejour.ci` et `https://bosejour.ci` dans la variable d'environnement `CORS_ALLOWED_ORIGINS`.

### Étape 1 : Se connecter au serveur backend

```bash
# Connectez-vous au serveur où se trouve le backend Laravel
# (probablement le serveur où se trouve https://apimonbeaupays.loyerpay.ci)
```

### Étape 2 : Modifier le fichier .env

```bash
# Aller dans le dossier backend
cd /chemin/vers/backend

# Éditer le fichier .env
nano .env
```

### Étape 3 : Modifier CORS_ALLOWED_ORIGINS

Trouvez la ligne `CORS_ALLOWED_ORIGINS` et ajoutez les domaines :

```env
CORS_ALLOWED_ORIGINS=http://bosejour.ci,https://bosejour.ci,http://72.62.31.145,https://monbeaupays.com,https://www.monbeaupays.com
```

**OU** si la ligne n'existe pas, ajoutez-la :

```env
CORS_ALLOWED_ORIGINS=http://bosejour.ci,https://bosejour.ci,http://72.62.31.145,https://monbeaupays.com,https://www.monbeaupays.com,http://localhost:3000,http://localhost:3001
```

### Étape 4 : Vider le cache Laravel

```bash
# Sur le serveur backend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

### Étape 5 : Redémarrer PHP-FPM (si nécessaire)

```bash
systemctl restart php8.2-fpm
# ou la version de PHP que vous utilisez
```

## ✅ Vérification

Testez depuis le frontend :

```bash
# Depuis votre machine locale ou le serveur frontend
curl -H "Origin: http://bosejour.ci" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://apimonbeaupays.loyerpay.ci/api/accommodations -v
```

Vous devriez voir dans les headers de réponse :
```
Access-Control-Allow-Origin: http://bosejour.ci
```

## 🔍 Vérification dans le navigateur

1. Ouvrez `http://bosejour.ci` dans votre navigateur
2. Ouvrez la console (F12) > Network
3. Regardez les requêtes API - elles ne devraient plus avoir d'erreur CORS

## 📝 Note

Si vous utilisez aussi `https://bosejour.ci`, assurez-vous d'ajouter les deux versions (http et https) dans `CORS_ALLOWED_ORIGINS`.

