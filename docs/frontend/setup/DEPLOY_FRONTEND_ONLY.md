# Déploiement Frontend Uniquement - VPS 72.62.31.145

Guide pour déployer uniquement le frontend Next.js. Le backend est déjà en ligne sur `https://apimonbeaupays.loyerpay.ci/api`.

## 🚀 Déploiement Rapide

### Étape 1 : Configuration Initiale (une seule fois)

```bash
# Exécuter le script de configuration
cat /Users/lkmdigital/monbeaupays.com/frontend/setup-frontend-only.sh | ssh root@72.62.31.145 'bash -s'
```
password : 1Lkmdigital@

### Étape 2 : Déploiement du Frontend

```bash
# Depuis votre machine locale
cd /Users/lkmdigital/monbeaupays.com/frontend
./deploy-new-vps.sh
```

### Étape 3 : Rebuild et Redémarrage (sur le serveur)

```bash
ssh root@72.62.31.145

cd /var/www/monbeaupays-frontend

# Supprimer l'ancien build
rm -rf .next

# Rebuild avec la bonne configuration API
npm run build

# Redémarrer PM2
pm2 restart monbeaupays-frontend

# Vérifier les logs
pm2 logs monbeaupays-frontend --lines 20
```

## ✅ Vérifications

### 1. Vérifier le fichier .env.production

```bash
ssh root@72.62.31.145
cat /var/www/monbeaupays-frontend/.env.production
```

**Doit contenir** :
```
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
```

### 2. Vérifier que Next.js tourne

```bash
curl http://localhost:3000
```

### 3. Vérifier que Nginx fonctionne

```bash
curl http://localhost
curl http://72.62.31.145
```

### 4. Tester l'API depuis le frontend

Ouvrez `http://72.62.31.145` dans votre navigateur et vérifiez la console (F12) pour voir si les requêtes API fonctionnent.

## 🔧 Configuration Nginx

La configuration Nginx ne doit **PAS** router `/api` car le frontend fait les requêtes directement vers le backend externe.

**Configuration correcte** :

```nginx
server {
    listen 80;
    server_name 72.62.31.145;

    client_max_body_size 20M;
    access_log /var/log/nginx/monbeaupays-frontend-access.log;
    error_log /var/log/nginx/monbeaupays-frontend-error.log;

    # Seulement proxy vers Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

**⚠️ IMPORTANT** : Il ne doit **PAS** y avoir de `location /api` dans la configuration Nginx car le frontend fait les requêtes directement vers `https://apimonbeaupays.loyerpay.ci/api`.

## 🐛 Dépannage

### Erreur 404 sur les requêtes API

1. **Vérifier le fichier .env.production** :
```bash
cat /var/www/monbeaupays-frontend/.env.production
```

2. **Vérifier que le build a été refait** :
```bash
# Le build doit être refait après modification de .env.production
cd /var/www/monbeaupays-frontend
rm -rf .next
npm run build
pm2 restart monbeaupays-frontend
```

3. **Vérifier dans la console du navigateur** :
   - Ouvrez F12 > Network
   - Regardez les requêtes API
   - Vérifiez qu'elles pointent vers `https://apimonbeaupays.loyerpay.ci/api`

### CORS Error

Si vous avez des erreurs CORS, vérifiez que le backend autorise les requêtes depuis `http://72.62.31.145`.

### Le frontend ne charge pas

```bash
# Vérifier PM2
pm2 status
pm2 logs monbeaupays-frontend

# Vérifier Nginx
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

## 📝 Commandes Utiles

```bash
# Voir les logs en temps réel
pm2 logs monbeaupays-frontend

# Redémarrer l'application
pm2 restart monbeaupays-frontend

# Voir le statut
pm2 status

# Vérifier la configuration
cat /var/www/monbeaupays-frontend/.env.production
```

## ✅ Checklist

- [ ] Le fichier `.env.production` existe et contient `NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api`
- [ ] Le build a été refait après configuration de `.env.production`
- [ ] PM2 tourne et l'application est active
- [ ] Nginx est configuré (sans routing `/api`)
- [ ] L'application est accessible sur `http://72.62.31.145`
- [ ] Les requêtes API fonctionnent (vérifier dans la console du navigateur)

