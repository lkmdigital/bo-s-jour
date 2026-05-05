# Correction : Installation SSL

Le certificat SSL a été obtenu mais n'a pas pu être installé automatiquement. Voici comment corriger.

## 🔧 Solution Rapide

### Sur le serveur, exécutez ces commandes :

```bash
# 1. Modifier la configuration Nginx pour ajouter server_name
nano /etc/nginx/sites-available/monbeaupays-frontend
```

**Modifiez la ligne `server_name` pour inclure le domaine :**

```nginx
server {
    listen 80;
    server_name bosejour.ci;  # ← Ajoutez cette ligne si elle n'existe pas

    client_max_body_size 20M;
    access_log /var/log/nginx/monbeaupays-frontend-access.log;
    error_log /var/log/nginx/monbeaupays-frontend-error.log;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### Puis :

```bash
# 2. Tester la configuration
nginx -t

# 3. Redémarrer Nginx
systemctl reload nginx

# 4. Installer le certificat SSL
certbot install --cert-name bosejour.ci
```

## ✅ Vérification

Après l'installation :

```bash
# Tester HTTPS
curl https://bosejour.ci

# Vérifier la redirection HTTP
curl -I http://bosejour.ci
# Devrait retourner: HTTP/1.1 301 Moved Permanently
```

## 🔍 Si ça ne fonctionne toujours pas

Vérifiez que le fichier de configuration contient bien `server_name bosejour.ci;` :

```bash
grep -n "server_name" /etc/nginx/sites-available/monbeaupays-frontend
```

Si la ligne n'existe pas ou contient une autre valeur, modifiez-la.

## 📝 Configuration Manuelle SSL (Alternative)

Si Certbot ne peut toujours pas installer automatiquement, vous pouvez configurer SSL manuellement :

```bash
# Éditer la configuration Nginx
nano /etc/nginx/sites-available/monbeaupays-frontend
```

Ajoutez la configuration HTTPS :

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name bosejour.ci;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name bosejour.ci;

    ssl_certificate /etc/letsencrypt/live/bosejour.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bosejour.ci/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20M;
    access_log /var/log/nginx/monbeaupays-frontend-access.log;
    error_log /var/log/nginx/monbeaupays-frontend-error.log;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Puis :

```bash
nginx -t
systemctl reload nginx
```

