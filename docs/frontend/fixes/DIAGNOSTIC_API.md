# Diagnostic : API ne fonctionne plus

Guide pour diagnostiquer et corriger les problèmes de connexion à l'API.

## 🔍 Diagnostic Rapide

### 1. Vérifier dans le navigateur

1. Ouvrez `https://bosejour.ci`
2. Ouvrez la console (F12) > Network
3. Essayez de vous connecter
4. Regardez les requêtes API :
   - URL appelée
   - Code de réponse
   - Message d'erreur

### 2. Erreurs courantes

#### Erreur : "Network Error" ou "Failed to fetch"
- **Cause** : Le backend ne répond pas ou CORS bloqué
- **Solution** : Vérifier que le backend est en ligne

#### Erreur : "404 Not Found"
- **Cause** : URL API incorrecte
- **Solution** : Vérifier `NEXT_PUBLIC_API_URL` dans `.env.production`

#### Erreur : "CORS policy"
- **Cause** : Backend ne permet pas les requêtes depuis bosejour.ci
- **Solution** : Ajouter `https://bosejour.ci` dans `CORS_ALLOWED_ORIGINS` du backend

#### Erreur : "500 Internal Server Error"
- **Cause** : Erreur serveur backend
- **Solution** : Vérifier les logs backend

#### Erreur : "401 Unauthorized"
- **Cause** : Token invalide ou expiré
- **Solution** : Se reconnecter

## 🔧 Solutions

### Solution 1 : Vérifier l'URL de l'API

Sur le serveur frontend :

```bash
cd /var/www/monbeaupays-frontend
cat .env.production
```

Doit contenir :
```env
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
```

Si incorrect, corriger et rebuild :
```bash
rm -rf .next
npm run build
pm2 restart monbeaupays-frontend
```

### Solution 2 : Vérifier que le backend répond

```bash
curl https://apimonbeaupays.loyerpay.ci/api/accommodations
```

Si erreur, le backend a un problème.

### Solution 3 : Vérifier CORS

Sur le serveur backend, vérifier `.env` :
```env
CORS_ALLOWED_ORIGINS=https://bosejour.ci,http://bosejour.ci,...
```

Puis vider le cache :
```bash
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

### Solution 4 : Vérifier les logs backend

```bash
tail -n 100 storage/logs/laravel.log
```

## 🐛 Problèmes Spécifiques

### Après ajout du 2FA

Si vous venez d'ajouter le 2FA et que la connexion ne fonctionne plus :

1. Vérifier que la migration 2FA a été exécutée
2. Vérifier que les fichiers 2FA sont téléversés
3. Vérifier les logs pour les erreurs de classe manquante

### Après modification du code

1. Vérifier que tous les fichiers sont téléversés
2. Vérifier que le cache Laravel est vidé
3. Vérifier que Composer autoload est régénéré

## 📞 Support

Partagez :
1. L'erreur exacte dans la console du navigateur
2. Le code HTTP de la requête API
3. Les logs backend (si possible)



