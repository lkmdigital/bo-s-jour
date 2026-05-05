# Guide de Déploiement Complet - VPS 72.62.31.145

Guide complet pour déployer MonBeauPays (Backend Laravel + Frontend Next.js) sur le nouveau VPS.

## 📋 Informations du Serveur

- **IP VPS** : 72.62.31.145
- **Utilisateur** : root
- **Connexion SSH** : `ssh root@72.62.31.145`

---

## 🚀 ÉTAPE 1 : Préparation du Serveur

### 1.1 Connexion SSH

```bash
ssh root@72.62.31.145
```

### 1.2 Mise à jour du système

```bash
# Pour Ubuntu/Debian
apt update && apt upgrade -y

# Installation des outils essentiels
apt install -y curl wget git unzip software-properties-common
```

### 1.3 Configuration du Firewall

```bash
# Installer UFW si nécessaire
apt install -y ufw

# Autoriser SSH (IMPORTANT : faites-le en premier)
ufw allow 22/tcp

# Autoriser HTTP et HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Autoriser le port pour Laravel (si nécessaire)
ufw allow 8000/tcp

# Activer le firewall
ufw enable

# Vérifier le statut
ufw status
```

---

## 🔧 ÉTAPE 2 : Installation des Dépendances Backend (Laravel)

### 2.1 Installation de PHP 8.2+

```bash
# Ajouter le dépôt PHP
add-apt-repository ppa:ondrej/php -y
apt update

# Installer PHP et extensions nécessaires
apt install -y php8.2 \
    php8.2-fpm \
    php8.2-cli \
    php8.2-common \
    php8.2-mysql \
    php8.2-zip \
    php8.2-gd \
    php8.2-mbstring \
    php8.2-curl \
    php8.2-xml \
    php8.2-bcmath \
    php8.2-intl \
    php8.2-readline

# Vérifier l'installation
php -v
```

### 2.2 Installation de Composer

```bash
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer

# Vérifier l'installation
composer --version
```

### 2.3 Installation de MySQL/MariaDB

```bash
# Installer MySQL
apt install -y mysql-server

# Sécuriser MySQL (optionnel mais recommandé)
mysql_secure_installation

# Créer la base de données
mysql -u root -p << EOF
CREATE DATABASE monbeaupays CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'monbeaupays_user'@'localhost' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_SECURISE';
GRANT ALL PRIVILEGES ON monbeaupays.* TO 'monbeaupays_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF
```

### 2.4 Installation de Nginx

```bash
apt install -y nginx

# Démarrer et activer Nginx
systemctl start nginx
systemctl enable nginx

# Vérifier le statut
systemctl status nginx
```

---

## 🔧 ÉTAPE 3 : Installation des Dépendances Frontend (Next.js)

### 3.1 Installation de Node.js 20 LTS

```bash
# Via NodeSource (recommandé)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version   # Doit afficher 10.x.x
```

### 3.2 Installation de PM2

```bash
npm install -g pm2

# Vérifier l'installation
pm2 --version

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivez les instructions affichées
```

---

## 📁 ÉTAPE 4 : Déploiement du Backend Laravel

### 4.1 Créer le dossier de l'application

```bash
mkdir -p /var/www/monbeaupays-backend
cd /var/www/monbeaupays-backend
```

### 4.2 Transfert des fichiers depuis votre machine locale

**Depuis votre machine locale** :

```bash
cd /Users/lkmdigital/monbeaupays.com/backend

# Transfert via rsync (recommandé)
rsync -avz --exclude 'vendor' \
           --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'storage/logs/*' \
           --exclude 'storage/framework/cache/*' \
           --exclude 'storage/framework/sessions/*' \
           --exclude 'storage/framework/views/*' \
           --exclude '.env' \
           ./ root@72.62.31.145:/var/www/monbeaupays-backend/
```

### 4.3 Configuration sur le serveur

```bash
# Sur le serveur VPS
cd /var/www/monbeaupays-backend

# Installer les dépendances
composer install --optimize-autoloader --no-dev

# Copier le fichier .env
cp env.production.template .env

# Éditer le fichier .env
nano .env
```

**Configuration minimale du .env** :

```env
APP_NAME="MonBeauPays"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://72.62.31.145

LOG_CHANNEL=daily
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=monbeaupays
DB_USERNAME=monbeaupays_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

SANCTUM_STATEFUL_DOMAINS=72.62.31.145

CORS_ALLOWED_ORIGINS=http://72.62.31.145,https://72.62.31.145
```

### 4.4 Générer la clé d'application

```bash
php artisan key:generate
```

### 4.5 Configuration des permissions

```bash
# Créer les dossiers de stockage
mkdir -p storage/framework/{sessions,views,cache}
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Définir les permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

### 4.6 Migration de la base de données

```bash
# Exécuter les migrations
php artisan migrate --force

# Exécuter les seeders (optionnel)
php artisan db:seed --class=RolePermissionSeeder
php artisan db:seed --class=PaymentMethodSeeder
php artisan db:seed --class=AdminUserSeeder
```

### 4.7 Optimisation pour la production

```bash
# Cache de configuration
php artisan config:cache

# Cache des routes
php artisan route:cache

# Cache des vues
php artisan view:cache

# Optimiser l'autoloader
composer dump-autoload --optimize
```

---

## 🌐 ÉTAPE 5 : Configuration Nginx pour le Backend

### 5.1 Créer la configuration Nginx

```bash
nano /etc/nginx/sites-available/monbeaupays-backend
```

**Configuration Nginx pour Laravel** :

```nginx
server {
    listen 80;
    server_name 72.62.31.145;
    
    root /var/www/monbeaupays-backend/public;
    index index.php index.html;

    # Taille maximale des uploads
    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/monbeaupays-backend-access.log;
    error_log /var/log/nginx/monbeaupays-backend-error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Cache pour les assets statiques
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 Activer la configuration

```bash
# Créer le lien symbolique
ln -s /etc/nginx/sites-available/monbeaupays-backend /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut
rm /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

### 5.3 Vérifier PHP-FPM

```bash
# Vérifier que PHP-FPM tourne
systemctl status php8.2-fpm

# Redémarrer si nécessaire
systemctl restart php8.2-fpm
```

---

## 📁 ÉTAPE 6 : Déploiement du Frontend Next.js

### 6.1 Créer le dossier de l'application

```bash
mkdir -p /var/www/monbeaupays-frontend
cd /var/www/monbeaupays-frontend
```

### 6.2 Transfert des fichiers depuis votre machine locale

**Depuis votre machine locale** :

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend

# Transfert via rsync
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude '.DS_Store' \
           --exclude '*.log' \
           --exclude '.env.local' \
           --exclude '.env.development' \
           ./ root@72.62.31.145:/var/www/monbeaupays-frontend/
```

### 6.3 Configuration sur le serveur

```bash
# Sur le serveur VPS
cd /var/www/monbeaupays-frontend

# Installer les dépendances
npm ci --production=false

# Créer le fichier .env.production
nano .env.production
```

**Configuration .env.production** :

```env
NEXT_PUBLIC_API_URL=http://72.62.31.145/api
NODE_ENV=production
```

### 6.4 Créer le build de production

```bash
npm run build
```

### 6.5 Configuration PM2

```bash
# Créer le fichier ecosystem.config.js
nano ecosystem.config.js
```

**Contenu de ecosystem.config.js** :

```javascript
module.exports = {
  apps: [{
    name: 'monbeaupays-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/monbeaupays-frontend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/monbeaupays-frontend-error.log',
    out_file: '/var/log/pm2/monbeaupays-frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 6.6 Démarrer l'application avec PM2

```bash
# Créer le dossier de logs
mkdir -p /var/log/pm2

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Vérifier le statut
pm2 status
pm2 logs monbeaupays-frontend
```

---

## 🌐 ÉTAPE 7 : Configuration Nginx pour le Frontend

### 7.1 Créer la configuration Nginx

```bash
nano /etc/nginx/sites-available/monbeaupays-frontend
```

**Configuration Nginx pour Next.js** :

```nginx
server {
    listen 3001;
    server_name 72.62.31.145;

    # Taille maximale des uploads
    client_max_body_size 20M;

    # Logs
    access_log /var/log/nginx/monbeaupays-frontend-access.log;
    error_log /var/log/nginx/monbeaupays-frontend-error.log;

    # Proxy vers Next.js
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

    # Cache pour les assets statiques
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.2 Configuration principale Nginx (reverse proxy)

Créer une configuration principale qui redirige vers le backend ou le frontend :

```bash
nano /etc/nginx/sites-available/monbeaupays
```

**Configuration principale** :

```nginx
# Redirection vers le frontend (port 80)
server {
    listen 80;
    server_name 72.62.31.145;

    # Proxy vers Next.js
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

    # API vers Laravel
    location /api {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 Activer la configuration

```bash
# Activer la configuration principale
ln -s /etc/nginx/sites-available/monbeaupays /etc/nginx/sites-enabled/

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

---

## ✅ ÉTAPE 8 : Vérifications Finales

### 8.1 Vérifier les services

```bash
# Vérifier Nginx
systemctl status nginx

# Vérifier PHP-FPM
systemctl status php8.2-fpm

# Vérifier MySQL
systemctl status mysql

# Vérifier PM2
pm2 status
pm2 logs
```

### 8.2 Tester l'accès

```bash
# Tester le backend
curl http://localhost/api/accommodations

# Tester le frontend
curl http://localhost:3000

# Tester depuis l'extérieur
curl http://72.62.31.145
```

### 8.3 Vérifier les logs

```bash
# Logs Nginx
tail -f /var/log/nginx/monbeaupays-access.log
tail -f /var/log/nginx/monbeaupays-error.log

# Logs Laravel
tail -f /var/www/monbeaupays-backend/storage/logs/laravel.log

# Logs PM2
pm2 logs monbeaupays-frontend
```

---

## 🔄 ÉTAPE 9 : Scripts de Déploiement Automatisé

### 9.1 Script de déploiement Backend

Créer `/var/www/monbeaupays-backend/deploy.sh` :

```bash
#!/bin/bash
set -e

cd /var/www/monbeaupays-backend

echo "🔄 Mise à jour du code..."
git pull origin main || echo "Git non disponible, continuons..."

echo "📦 Installation des dépendances..."
composer install --optimize-autoloader --no-dev

echo "🗄️ Exécution des migrations..."
php artisan migrate --force

echo "⚙️ Optimisation..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Déploiement terminé !"
```

### 9.2 Script de déploiement Frontend

Créer `/var/www/monbeaupays-frontend/deploy.sh` :

```bash
#!/bin/bash
set -e

cd /var/www/monbeaupays-frontend

echo "🔄 Mise à jour du code..."
git pull origin main || echo "Git non disponible, continuons..."

echo "📦 Installation des dépendances..."
npm ci --production=false

echo "🏗️ Build de production..."
npm run build

echo "🔄 Redémarrage de l'application..."
pm2 restart monbeaupays-frontend

echo "✅ Déploiement terminé !"
```

Rendre les scripts exécutables :

```bash
chmod +x /var/www/monbeaupays-backend/deploy.sh
chmod +x /var/www/monbeaupays-frontend/deploy.sh
```

---

## 📝 Commandes Utiles

### Backend Laravel

```bash
# Voir les logs
tail -f /var/www/monbeaupays-backend/storage/logs/laravel.log

# Exécuter les migrations
cd /var/www/monbeaupays-backend && php artisan migrate

# Vider les caches
cd /var/www/monbeaupays-backend && php artisan cache:clear && php artisan config:clear

# Créer un utilisateur admin
cd /var/www/monbeaupays-backend && php artisan db:seed --class=AdminUserSeeder
```

### Frontend Next.js

```bash
# Voir les logs PM2
pm2 logs monbeaupays-frontend

# Redémarrer l'application
pm2 restart monbeaupays-frontend

# Arrêter l'application
pm2 stop monbeaupays-frontend

# Voir le statut
pm2 status
```

### Nginx

```bash
# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx

# Recharger la configuration
systemctl reload nginx

# Voir les logs
tail -f /var/log/nginx/error.log
```

---

## 🔐 ÉTAPE 10 : Configuration SSL (Optionnel)

Si vous avez un nom de domaine :

```bash
# Installer Certbot
apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Vérifier le renouvellement automatique
certbot renew --dry-run
```

---

## ✅ Checklist de Déploiement

- [ ] Serveur VPS accessible via SSH
- [ ] Système mis à jour
- [ ] Firewall configuré (ports 22, 80, 443)
- [ ] PHP 8.2+ installé avec toutes les extensions
- [ ] Composer installé
- [ ] MySQL installé et base de données créée
- [ ] Node.js 20 LTS installé
- [ ] PM2 installé et configuré
- [ ] Nginx installé et configuré
- [ ] Backend Laravel déployé et configuré
- [ ] Frontend Next.js déployé et configuré
- [ ] Migrations de base de données exécutées
- [ ] Permissions de fichiers configurées
- [ ] Services démarrés (Nginx, PHP-FPM, PM2, MySQL)
- [ ] Application accessible via http://72.62.31.145
- [ ] API accessible via http://72.62.31.145/api
- [ ] Logs vérifiés (pas d'erreurs)

---

**Bon déploiement ! 🚀**

