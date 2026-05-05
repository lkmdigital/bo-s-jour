# Correction : API ne fonctionne plus

## 🔍 Diagnostic Immédiat

### Étape 1 : Tester depuis le navigateur

1. Ouvrez `https://bosejour.ci`
2. Ouvrez la console (F12) > Console
3. Regardez les erreurs affichées
4. Ouvrez l'onglet Network
5. Essayez de vous connecter
6. Regardez la requête `/api/login` :
   - URL complète
   - Code de réponse
   - Message d'erreur

### Étape 2 : Tester l'API directement

Ouvrez cette page de test :
```
https://bosejour.ci/test-api-connection.html
```

OU testez avec curl :
```bash
curl https://apimonbeaupays.loyerpay.ci/api/accommodations
```

## 🔧 Solutions selon l'erreur

### Erreur : "Network Error" ou "Failed to fetch"

**Cause** : Le backend ne répond pas ou est inaccessible

**Solution** :
```bash
# Vérifier que le backend est en ligne
curl https://apimonbeaupays.loyerpay.ci/api/accommodations

# Si erreur, vérifier le serveur backend
```

### Erreur : "404 Not Found"

**Cause** : URL API incorrecte dans le frontend

**Solution sur le serveur frontend** :
```bash
cd /var/www/monbeaupays-frontend

# Vérifier .env.production
cat .env.production
# Doit contenir: NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api

# Si incorrect, corriger
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
EOF

# Rebuild (IMPORTANT)
rm -rf .next
npm run build
pm2 restart monbeaupays-frontend
```

### Erreur : "CORS policy"

**Cause** : Backend ne permet pas les requêtes depuis bosejour.ci

**Solution sur le serveur backend** :
```bash
# Vérifier .env
cat .env | grep CORS_ALLOWED_ORIGINS

# Doit contenir: https://bosejour.ci,http://bosejour.ci

# Si manquant, ajouter dans .env
# CORS_ALLOWED_ORIGINS=https://bosejour.ci,http://bosejour.ci,...

# Vider le cache
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

### Erreur : "500 Internal Server Error"

**Cause** : Erreur serveur backend

**Solution** :
```bash
# Sur le serveur backend
tail -n 100 storage/logs/laravel.log

# Chercher l'erreur exacte et corriger
```

### Erreur : "401 Unauthorized" après connexion

**Cause** : Token invalide ou problème d'authentification

**Solution** :
1. Vider le localStorage du navigateur
2. Se reconnecter
3. Vérifier que le token est bien stocké

## 🚨 Solution Rapide Complète

### Sur le serveur frontend :

```bash
cd /var/www/monbeaupays-frontend

# 1. Vérifier/corriger .env.production
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
EOF

# 2. Rebuild
rm -rf .next
npm run build

# 3. Redémarrer
pm2 restart monbeaupays-frontend

# 4. Vérifier
pm2 logs monbeaupays-frontend --lines 20
```

### Sur le serveur backend :

```bash
# 1. Vérifier CORS dans .env
# Doit contenir: CORS_ALLOWED_ORIGINS=https://bosejour.ci,http://bosejour.ci

# 2. Vider le cache
php artisan config:clear
php artisan cache:clear
php artisan config:cache

# 3. Vérifier les logs
tail -n 50 storage/logs/laravel.log
```

## 📋 Checklist

- [ ] Backend répond (test avec curl)
- [ ] URL API correcte dans .env.production
- [ ] Frontend rebuild après modification .env
- [ ] CORS configuré sur le backend
- [ ] Cache Laravel vidé
- [ ] Pas d'erreur dans les logs backend
- [ ] Pas d'erreur dans la console navigateur

## 🔍 Informations à Partager

Si le problème persiste, partagez :
1. L'erreur exacte dans la console (F12)
2. Le code HTTP de la requête API (Network tab)
3. La réponse complète de l'API
4. Les logs backend (si possible)



