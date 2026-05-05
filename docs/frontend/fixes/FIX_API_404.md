# Correction de l'Erreur 404 Not Found - API

Si vous obtenez une erreur 404 Not Found, c'est que l'URL de l'API n'est pas correctement configurée.

## 🔍 Diagnostic

### Vérifier l'URL de l'API utilisée

Ouvrez la console du navigateur (F12) et regardez les requêtes réseau. Vous devriez voir l'URL complète utilisée pour les appels API.

## 🔧 Solution

### Option 1 : Script Automatique (Recommandé)

Exécutez ce script depuis votre machine locale :

```bash
cat /Users/lkmdigital/monbeaupays.com/frontend/check-and-fix-api-url.sh | ssh root@72.62.31.145 'bash -s'
```

Puis redémarrez l'application :

```bash
ssh root@72.62.31.145 "cd /var/www/monbeaupays-frontend && pm2 restart monbeaupays-frontend"
```

### Option 2 : Correction Manuelle

#### Étape 1 : Vérifier le fichier .env.production sur le serveur

```bash
ssh root@72.62.31.145
cd /var/www/monbeaupays-frontend
cat .env.production
```

#### Étape 2 : Créer ou corriger le fichier .env.production

```bash
# Sur le serveur
cd /var/www/monbeaupays-frontend

# Créer ou éditer le fichier
nano .env.production
```

**Contenu du fichier .env.production** :

```env
NEXT_PUBLIC_API_URL=http://72.62.31.145/api
NODE_ENV=production
```

Sauvegardez avec `Ctrl+O`, puis `Enter`, puis `Ctrl+X`.

#### Étape 3 : Vérifier que le backend répond

```bash
# Tester l'API directement
curl http://72.62.31.145/api/accommodations

# Si ça ne fonctionne pas, tester localhost
curl http://localhost/api/accommodations
```

#### Étape 4 : Rebuild et redémarrer

```bash
cd /var/www/monbeaupays-frontend

# Supprimer l'ancien build (pour forcer la recompilation avec la nouvelle URL)
rm -rf .next

# Rebuild
npm run build

# Redémarrer PM2
pm2 restart monbeaupays-frontend

# Vérifier les logs
pm2 logs monbeaupays-frontend --lines 50
```

## 🐛 Dépannage

### L'API retourne toujours 404

1. **Vérifier que le backend Laravel est accessible** :
```bash
# Sur le serveur
curl http://localhost/api/accommodations
curl http://72.62.31.145/api/accommodations
```

2. **Vérifier la configuration Nginx du backend** :
```bash
# Vérifier que le backend est bien configuré
cat /etc/nginx/sites-available/monbeaupays-backend
nginx -t
```

3. **Vérifier que PHP-FPM tourne** :
```bash
systemctl status php8.2-fpm
```

### L'URL dans le navigateur est incorrecte

Si dans la console du navigateur vous voyez encore l'ancienne URL (`https://apimonbeaupays.loyerpay.ci/api`), c'est que :

1. Le fichier `.env.production` n'existe pas ou n'est pas lu
2. Le build n'a pas été refait après la modification
3. Le cache du navigateur utilise l'ancienne version

**Solution** :
```bash
# Sur le serveur
cd /var/www/monbeaupays-frontend

# Vérifier que le fichier existe et contient la bonne URL
cat .env.production

# Supprimer le build
rm -rf .next

# Rebuild
npm run build

# Redémarrer
pm2 restart monbeaupays-frontend
```

### Vérifier l'URL utilisée par Next.js

Pour voir quelle URL est réellement utilisée, vous pouvez temporairement ajouter un log dans `lib/api.ts` :

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://72.62.31.145/api';
console.log('API URL:', API_URL); // À retirer après diagnostic
```

Puis regarder les logs PM2 :
```bash
pm2 logs monbeaupays-frontend
```

## ✅ Checklist

- [ ] Le fichier `.env.production` existe dans `/var/www/monbeaupays-frontend`
- [ ] Le fichier contient `NEXT_PUBLIC_API_URL=http://72.62.31.145/api`
- [ ] Le backend Laravel répond sur `http://72.62.31.145/api/accommodations`
- [ ] Le build a été refait après modification du `.env.production`
- [ ] PM2 a été redémarré après le rebuild
- [ ] Le cache du navigateur a été vidé (Ctrl+Shift+R ou Cmd+Shift+R)

## 🔄 Commandes Rapides

```bash
# Tout vérifier et corriger d'un coup
ssh root@72.62.31.145 "cd /var/www/monbeaupays-frontend && \
  echo 'NEXT_PUBLIC_API_URL=http://72.62.31.145/api' > .env.production && \
  echo 'NODE_ENV=production' >> .env.production && \
  rm -rf .next && \
  npm run build && \
  pm2 restart monbeaupays-frontend"
```

