# Correction de la Configuration Nginx

Si vous voyez la page par défaut de Nginx, suivez ces étapes :

## 🔍 Diagnostic

### 1. Vérifier que PM2 tourne

```bash
ssh root@72.62.31.145
pm2 status
```

Si l'application n'est pas dans la liste, démarrez-la :

```bash
cd /var/www/monbeaupays-frontend
pm2 start ecosystem.config.js
pm2 save
```

### 2. Vérifier que Next.js écoute sur le port 3000

```bash
# Sur le serveur
curl http://localhost:3000
```

Si ça ne fonctionne pas, vérifiez les logs :

```bash
pm2 logs monbeaupays-frontend
```

### 3. Vérifier la configuration Nginx actuelle

```bash
# Sur le serveur
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/default
```

## 🔧 Solution : Configuration Nginx Correcte

### Étape 1 : Supprimer la configuration par défaut

```bash
ssh root@72.62.31.145

# Supprimer le lien symbolique vers default
rm /etc/nginx/sites-enabled/default
```

### Étape 2 : Créer la configuration pour le frontend

```bash
# Sur le serveur
nano /etc/nginx/sites-available/monbeaupays-frontend
```

Copiez-collez cette configuration :

```nginx
server {
    listen 80;
    server_name 72.62.31.145;

    # Taille maximale des uploads
    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/monbeaupays-frontend-access.log;
    error_log /var/log/nginx/monbeaupays-frontend-error.log;

    # Proxy vers Next.js (port 3000)
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API vers le backend Laravel
    location /api {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache pour les assets statiques
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Gestion des erreurs
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

Sauvegardez avec `Ctrl+O`, puis `Enter`, puis `Ctrl+X`.

### Étape 3 : Activer la configuration

```bash
# Créer le lien symbolique
ln -s /etc/nginx/sites-available/monbeaupays-frontend /etc/nginx/sites-enabled/

# Tester la configuration
nginx -t

# Si le test est OK, redémarrer Nginx
systemctl restart nginx
```

### Étape 4 : Vérifier que tout fonctionne

```bash
# Vérifier que PM2 tourne
pm2 status

# Vérifier que Next.js répond
curl http://localhost:3000

# Vérifier que Nginx répond
curl http://localhost

# Vérifier les logs en cas d'erreur
tail -f /var/log/nginx/error.log
pm2 logs monbeaupays-frontend
```

## 🐛 Dépannage

### Erreur 502 Bad Gateway

Cela signifie que Nginx ne peut pas se connecter à Next.js.

**Solutions :**

1. Vérifier que PM2 tourne :
```bash
pm2 status
pm2 logs monbeaupays-frontend
```

2. Vérifier que le port 3000 est utilisé :
```bash
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000
```

3. Redémarrer l'application :
```bash
cd /var/www/monbeaupays-frontend
pm2 restart monbeaupays-frontend
```

### L'application ne démarre pas avec PM2

```bash
cd /var/www/monbeaupays-frontend

# Vérifier que le fichier ecosystem.config.js existe
ls -la ecosystem.config.js

# Vérifier le contenu
cat ecosystem.config.js

# Démarrer manuellement pour voir les erreurs
npm run start

# Si ça fonctionne, arrêter (Ctrl+C) et démarrer avec PM2
pm2 start ecosystem.config.js
```

### Vérifier les variables d'environnement

```bash
cd /var/www/monbeaupays-frontend

# Vérifier que .env.production existe
cat .env.production

# Doit contenir au minimum :
# NEXT_PUBLIC_API_URL=http://72.62.31.145/api
# NODE_ENV=production
```

### Rebuild si nécessaire

```bash
cd /var/www/monbeaupays-frontend

# Supprimer l'ancien build
rm -rf .next

# Rebuild
npm run build

# Redémarrer
pm2 restart monbeaupays-frontend
```

## ✅ Checklist de Vérification

- [ ] PM2 est installé et l'application tourne (`pm2 status`)
- [ ] Next.js écoute sur le port 3000 (`curl http://localhost:3000`)
- [ ] Le fichier `.env.production` existe et est configuré
- [ ] Le build existe (`ls -la .next`)
- [ ] La configuration Nginx est correcte (`nginx -t`)
- [ ] Nginx pointe vers `http://localhost:3000`
- [ ] La configuration par défaut est supprimée
- [ ] Nginx est redémarré (`systemctl restart nginx`)

## 📝 Commandes Rapides

```bash
# Tout vérifier d'un coup
ssh root@72.62.31.145 "pm2 status && curl -s http://localhost:3000 | head -n 5 && nginx -t"
```

