# Correction Rapide : API ne fonctionne plus

## 🚨 Solution Immédiate

### Sur le serveur frontend :

```bash
ssh root@72.62.31.145

cd /var/www/monbeaupays-frontend

# 1. Vérifier/corriger .env.production
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
EOF

# 2. Rebuild (OBLIGATOIRE)
rm -rf .next
npm run build

# 3. Redémarrer
pm2 restart monbeaupays-frontend

# 4. Vérifier les logs
pm2 logs monbeaupays-frontend --lines 20
```

### Sur le serveur backend :

```bash
# 1. Vérifier que le backend répond
curl https://apimonbeaupays.loyerpay.ci/api/accommodations

# 2. Vérifier CORS dans .env
# Doit contenir: CORS_ALLOWED_ORIGINS=https://bosejour.ci,http://bosejour.ci

# 3. Vider le cache
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

## 🔍 Diagnostic dans le Navigateur

1. Ouvrez `https://bosejour.ci`
2. F12 > Console
3. Regardez les erreurs
4. F12 > Network
5. Essayez de vous connecter
6. Regardez la requête `/api/login` :
   - URL complète
   - Code HTTP
   - Message d'erreur

## ⚠️ Si le problème vient du 2FA

Si vous venez d'ajouter le 2FA et que la connexion ne fonctionne plus :

### Option 1 : Désactiver temporairement la vérification 2FA dans le login

Dans `AuthController.php`, commentez temporairement la vérification 2FA :

```php
// Vérifier si le 2FA est activé
// if ($user->two_factor_enabled) {
//     // Code 2FA...
// }
```

### Option 2 : Vérifier que la migration 2FA a été exécutée

```bash
# Sur le serveur backend
php artisan migrate:status
# Vérifier que la migration 2FA est exécutée
```

## 📞 Informations à Partager

Si le problème persiste, partagez :
1. L'erreur exacte dans la console (F12)
2. Le code HTTP de la requête
3. La réponse de l'API



