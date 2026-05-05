# Déploiement de la Correction CORS

Les fichiers suivants ont été modifiés pour autoriser `http://bosejour.ci` et `https://bosejour.ci` :

## 📝 Fichiers Modifiés

1. **`backend/config/cors.php`** - Ajout de `http://bosejour.ci` et `https://bosejour.ci` dans les origines par défaut
2. **`backend/env.production.template`** - Mise à jour de `CORS_ALLOWED_ORIGINS`

## 🚀 Déploiement

### Option 1 : Téléverser uniquement les fichiers modifiés

```bash
# Depuis votre machine locale
cd /Users/lkmdigital/monbeaupays.com/backend

# Téléverser le fichier cors.php
scp config/cors.php root@VOTRE_SERVEUR_BACKEND:/chemin/vers/backend/config/cors.php

# Téléverser le template (optionnel, pour référence)
scp env.production.template root@VOTRE_SERVEUR_BACKEND:/chemin/vers/backend/env.production.template
```

### Option 2 : Téléverser via rsync

```bash
# Depuis votre machine locale
cd /Users/lkmdigital/monbeaupays.com/backend

rsync -avz config/cors.php root@VOTRE_SERVEUR_BACKEND:/chemin/vers/backend/config/
```

## ⚙️ Configuration sur le Serveur Backend

### Étape 1 : Téléverser les fichiers

Téléversez `config/cors.php` sur le serveur backend.

### Étape 2 : Modifier le fichier .env (si nécessaire)

Sur le serveur backend, modifiez le fichier `.env` :

```bash
# Sur le serveur backend
cd /chemin/vers/backend
nano .env
```

Ajoutez ou modifiez la ligne :

```env
CORS_ALLOWED_ORIGINS=http://bosejour.ci,https://bosejour.ci,http://72.62.31.145,https://monbeaupays.com,https://www.monbeaupays.com
```

### Étape 3 : Vider le cache Laravel

```bash
# Sur le serveur backend
cd /chemin/vers/backend

php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

### Étape 4 : Redémarrer PHP-FPM (si nécessaire)

```bash
systemctl restart php8.2-fpm
# ou la version de PHP que vous utilisez (php8.1-fpm, php8.0-fpm, etc.)
```

## ✅ Vérification

### Test depuis le serveur backend

```bash
# Tester CORS avec curl
curl -H "Origin: http://bosejour.ci" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://apimonbeaupays.loyerpay.ci/api/accommodations -v
```

Vous devriez voir dans les headers :
```
Access-Control-Allow-Origin: http://bosejour.ci
```

### Test depuis le navigateur

1. Ouvrez `http://bosejour.ci` dans votre navigateur
2. Ouvrez la console (F12) > Network
3. Les requêtes API ne devraient plus avoir d'erreur CORS

## 📋 Checklist

- [ ] Fichier `config/cors.php` téléversé sur le serveur
- [ ] Fichier `.env` modifié avec `CORS_ALLOWED_ORIGINS` (si vous voulez utiliser la variable d'environnement)
- [ ] Cache Laravel vidé (`php artisan config:clear && php artisan config:cache`)
- [ ] PHP-FPM redémarré (si nécessaire)
- [ ] Test CORS réussi depuis le navigateur

## 🔍 Notes

- Si vous utilisez la variable d'environnement `CORS_ALLOWED_ORIGINS` dans `.env`, elle prendra le dessus sur les valeurs par défaut dans `cors.php`
- Les valeurs par défaut dans `cors.php` incluent maintenant `http://bosejour.ci` et `https://bosejour.ci`
- Assurez-vous que les deux versions (http et https) sont incluses si vous utilisez les deux

