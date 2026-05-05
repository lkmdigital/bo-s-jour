# 🚀 Guide de Déploiement sur Hostinger

Ce guide vous accompagne pour déployer MonBeauPays.com sur Hostinger.

## 📋 Prérequis

- Compte Hostinger avec accès SSH
- PHP 8.2 ou supérieur
- Node.js 18+ et npm
- MySQL/MariaDB
- Composer installé
- Accès FTP/SFTP ou SSH

## 📁 Structure de Déploiement Recommandée

```
public_html/
├── api/              # Backend Laravel (point d'entrée public)
│   └── public/       # Point d'entrée Laravel
├── app/              # Frontend Next.js (build statique ou SSR)
└── storage/          # Stockage Laravel (hors public_html)
```

**Alternative (si sous-domaine disponible) :**
- `api.monbeaupays.com` → Backend Laravel
- `monbeaupays.com` → Frontend Next.js

## 🔧 Étape 1 : Préparation du Backend Laravel

### 1.1 Configuration du serveur

1. **Connectez-vous via SSH ou FTP**
2. **Créez la structure de dossiers** :
   ```bash
   cd ~/domains/votre-domaine.com
   mkdir -p api/storage api/bootstrap/cache
   ```

### 1.2 Upload des fichiers

1. **Uploadez tous les fichiers du dossier `backend/`** vers `api/`
2. **Assurez-vous que la structure est** :
   ```
   api/
   ├── app/
   ├── bootstrap/
   ├── config/
   ├── database/
   ├── public/
   ├── routes/
   ├── storage/
   ├── vendor/
   ├── .env
   ├── artisan
   └── composer.json
   ```

### 1.3 Configuration des permissions

```bash
cd api
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### 1.4 Configuration de l'environnement

1. **Créez le fichier `.env`** dans `api/` :
   ```bash
   cp .env.example .env
   ```

2. **Éditez `.env`** avec vos informations :
   ```env
   APP_NAME="MonBeauPays"
   APP_ENV=production
   APP_KEY=base64:VOTRE_CLE_GENEREE
   APP_DEBUG=false
   APP_URL=https://api.monbeaupays.com
   # ou https://votre-domaine.com/api

   LOG_CHANNEL=stack
   LOG_LEVEL=error

   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=votre_base_de_donnees
   DB_USERNAME=votre_utilisateur_db
   DB_PASSWORD=votre_mot_de_passe_db

   BROADCAST_DRIVER=log
   CACHE_DRIVER=file
   FILESYSTEM_DISK=local
   QUEUE_CONNECTION=sync
   SESSION_DRIVER=file
   SESSION_LIFETIME=120

   MEMCACHED_HOST=127.0.0.1

   REDIS_HOST=127.0.0.1
   REDIS_PASSWORD=null
   REDIS_PORT=6379

   MAIL_MAILER=smtp
   MAIL_HOST=mailhog
   MAIL_PORT=1025
   MAIL_USERNAME=null
   MAIL_PASSWORD=null
   MAIL_ENCRYPTION=null
   MAIL_FROM_ADDRESS="noreply@monbeaupays.com"
   MAIL_FROM_NAME="${APP_NAME}"

   SANCTUM_STATEFUL_DOMAINS=votre-domaine.com,www.votre-domaine.com

   MALIA_PAY_API_URL=https://malia-pay.com/api/v1/OnlinePaymentService/add_payer
   MALIA_PAY_MERCHANT_ID=MI_AOXBNNUD2J
   MALIA_PAY_AGGREGATED_MERCHANT_ID=am-1j54gkvb820we
   ```

### 1.5 Installation des dépendances

```bash
cd api
composer install --no-dev --optimize-autoloader
```

### 1.6 Génération de la clé d'application

```bash
php artisan key:generate
```

### 1.7 Migration de la base de données

```bash
php artisan migrate --force
php artisan db:seed --class=RolePermissionSeeder
php artisan db:seed --class=AdminUserSeeder
php artisan db:seed --class=PaymentMethodSeeder
```

### 1.8 Optimisation pour la production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### 1.9 Configuration du lien symbolique pour le stockage

```bash
php artisan storage:link
```

### 1.10 Configuration Apache (.htaccess)

Créez un fichier `.htaccess` dans `api/public/` :

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

## 🎨 Étape 2 : Préparation du Frontend Next.js

### 2.1 Build de production

**En local** (avant l'upload) :

```bash
cd frontend
npm install
npm run build
```

### 2.2 Configuration de l'environnement

Créez un fichier `.env.production` dans `frontend/` :

```env
NEXT_PUBLIC_API_URL=https://api.monbeaupays.com/api
# ou https://votre-domaine.com/api
```

### 2.3 Upload des fichiers

1. **Uploadez le contenu du dossier `.next/`** (après le build)
2. **Uploadez aussi** :
   - `package.json`
   - `next.config.js`
   - `public/`
   - `node_modules/` (ou installez-les sur le serveur)

### 2.4 Installation sur le serveur (si nécessaire)

```bash
cd app
npm install --production
npm run start
```

**Note** : Pour un déploiement statique, utilisez `npm run build` puis servez le dossier `out/` via Apache.

### 2.5 Configuration Next.js pour la production

Mettez à jour `next.config.js` :

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Pour le déploiement sur serveur Node.js
  // ou 'export' pour un build statique
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'api.monbeaupays.com', // Votre domaine API
        pathname: '/storage/**',
      },
    ],
  },
}

module.exports = nextConfig
```

## 🌐 Étape 3 : Configuration Apache/Nginx

### 3.1 Configuration Apache (si sous-domaine API)

Créez un fichier `.htaccess` à la racine de `api/` :

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

### 3.2 Configuration pour le frontend

Si vous utilisez Apache, créez un `.htaccess` à la racine de `app/` :

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Handle Next.js routes
    RewriteRule ^_next/static - [L]
    RewriteRule ^_next/image - [L]
    RewriteRule ^static - [L]
    
    # Handle API routes (proxy to Laravel)
    RewriteCond %{REQUEST_URI} ^/api/(.*)$
    RewriteRule ^api/(.*)$ https://api.monbeaupays.com/api/$1 [P,L]
    
    # Handle all other routes
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

## 🔐 Étape 4 : Configuration de la Base de Données

1. **Créez la base de données** via le panneau Hostinger
2. **Créez un utilisateur** avec tous les privilèges
3. **Importez le schéma** (si nécessaire) :
   ```bash
   mysql -u votre_user -p votre_db < database/schema.sql
   ```
4. **Ou utilisez les migrations Laravel** :
   ```bash
   php artisan migrate --force
   ```

## 🔄 Étape 5 : Configuration CORS et Sanctum

Dans `api/config/cors.php` :

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['https://monbeaupays.com', 'https://www.monbeaupays.com'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

Dans `api/config/sanctum.php` :

```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'monbeaupays.com,www.monbeaupays.com')),
```

## 📧 Étape 6 : Configuration Email (Optionnel)

Configurez SMTP dans `.env` :

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@monbeaupays.com
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@monbeaupays.com"
MAIL_FROM_NAME="MonBeauPays"
```

## ✅ Étape 7 : Vérifications Post-Déploiement

1. **Testez l'API** :
   ```bash
   curl https://api.monbeaupays.com/api/accommodations
   ```

2. **Vérifiez les logs** :
   ```bash
   tail -f api/storage/logs/laravel.log
   ```

3. **Testez le frontend** :
   - Visitez `https://monbeaupays.com`
   - Vérifiez que les appels API fonctionnent
   - Testez la connexion/inscription

4. **Vérifiez les permissions** :
   ```bash
   ls -la api/storage
   ls -la api/bootstrap/cache
   ```

## 🔧 Maintenance et Mises à Jour

### Mise à jour du code

```bash
# Backend
cd api
git pull origin main  # ou uploader les nouveaux fichiers
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Frontend
cd app
git pull origin main  # ou uploader les nouveaux fichiers
npm install
npm run build
# Redémarrer le serveur Node.js si nécessaire
```

### Nettoyage des caches

```bash
cd api
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## 🐛 Dépannage

### Erreur 500

1. Vérifiez les logs : `api/storage/logs/laravel.log`
2. Vérifiez les permissions : `chmod -R 755 storage bootstrap/cache`
3. Vérifiez `.env` : `APP_DEBUG=true` temporairement pour voir l'erreur

### Erreur CORS

1. Vérifiez `config/cors.php`
2. Vérifiez `SANCTUM_STATEFUL_DOMAINS` dans `.env`

### Images non affichées

1. Vérifiez le lien symbolique : `php artisan storage:link`
2. Vérifiez les permissions : `chmod -R 755 storage/app/public`

### Base de données

1. Vérifiez les credentials dans `.env`
2. Testez la connexion : `php artisan tinker` puis `DB::connection()->getPdo();`

## 📞 Support

En cas de problème, consultez :
- Les logs Laravel : `api/storage/logs/laravel.log`
- Les logs Apache : via le panneau Hostinger
- La documentation Hostinger : https://www.hostinger.com/tutorials

---

**Bon déploiement ! 🚀**

