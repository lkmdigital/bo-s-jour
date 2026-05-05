# Déploiement Unifié MonBeauPays

Guide pour configurer le serveur et déployer backend + frontend avec validation.

## Vue d'ensemble

- **Backend** : Laravel (PHP 8.2, Composer, MySQL)
- **Frontend** : Next.js (Node.js 20, PM2)
- **Serveur** : Un seul VPS héberge les deux

---

## Cas courant : frontend déjà en ligne, ajouter le backend

Si **le frontend est déjà déployé** sur `monbeaupays.loyerpay.ci` et que vous devez ajouter uniquement le backend sur `apimonbeaupays.loyerpay.ci` :

### Étape 1 : Préparer le serveur (première fois)

```bash
cd /Users/lkmdigital/monbeaupays.com

# Transférer et exécuter le script backend-only
scp scripts/setup-backend-only.sh root@72.62.31.145:/tmp/
ssh root@72.62.31.145 'bash /tmp/setup-backend-only.sh'
```

### Étape 2 : Créer la base MySQL (sur le serveur)

```bash
ssh root@72.62.31.145
mysql -e "CREATE DATABASE IF NOT EXISTS monbeaupays;"
```

### Étape 3 : Configurer Nginx pour l'API

```bash
# Depuis votre machine locale
scp scripts/nginx-backend-only.conf root@72.62.31.145:/tmp/

# Puis sur le serveur
ssh root@72.62.31.145
sudo cp /tmp/nginx-backend-only.conf /etc/nginx/sites-available/monbeaupays-api
sudo ln -sf /etc/nginx/sites-available/monbeaupays-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Étape 4 : Premier déploiement backend

```bash
./deploy-unified.sh --backend-only
```

### Étape 5 : Configurer le .env sur le serveur

```bash
ssh root@72.62.31.145
cd /var/www/monbeaupays-backend

# Copier l'exemple et éditer
cp .env.example .env
nano .env   # Remplir DB_DATABASE, DB_USERNAME, DB_PASSWORD, APP_URL, APP_KEY

php artisan key:generate
php artisan migrate --force
chown -R www-data:www-data storage bootstrap/cache
```

### Étape 6 : Vérifier le CORS

S'assurer que le frontend (`monbeaupays.loyerpay.ci`) est autorisé dans `config/cors.php` du backend.

---

## 1. Configuration initiale du serveur (setup complet)

### Option A : Script automatique (première fois)

```bash
# Depuis votre machine locale
cd /Users/lkmdigital/monbeaupays.com

# Transférer et exécuter le script de setup sur le serveur
scp scripts/setup-server.sh root@72.62.31.145:/tmp/
ssh root@72.62.31.145 'bash /tmp/setup-server.sh'
```

### Option B : Installation manuelle

Voir `DEPLOYMENT_VPS_72.62.31.145.md` pour les étapes détaillées.

## 2. Fichier de configuration

Éditez `deploy.config` à la racine du projet :

```bash
# Serveur SSH
SERVER="root@72.62.31.145"

# Répertoires sur le serveur
BACKEND_DIR="/var/www/monbeaupays-backend"
FRONTEND_DIR="/var/www/monbeaupays-frontend"

# Services (adapter selon votre serveur)
PHP_SERVICE="php8.2-fpm"
NGINX_SERVICE="nginx"
PM2_APP="monbeaupays-frontend"
```

## 3. Script de déploiement unifié

### Mode interactif (avec validation)

```bash
./deploy-unified.sh
```

Le script demande :
- **Déployer le BACKEND ?** [O/n] — Répondre `n` pour refuser → seul le frontend sera déployé
- **Déployer le FRONTEND ?** [O/n] — Répondre `n` pour refuser → seul le backend sera déployé
- Si les deux sont acceptés (O ou Enter) → backend et frontend sont déployés

### Options en ligne de commande

```bash
# Déployer uniquement le backend
./deploy-unified.sh --backend-only

# Déployer uniquement le frontend
./deploy-unified.sh --frontend-only

# Déployer les deux sans demander (ci/cd)
./deploy-unified.sh --yes

# Spécifier un autre serveur
./deploy-unified.sh --server root@autre-serveur.com --yes
```

## 4. Prérequis sur le serveur

### Backend
- Dossier `/var/www/monbeaupays-backend` créé
- Fichier `.env` configuré (DB, APP_KEY, etc.)
- Permissions : `chown -R www-data:www-data storage bootstrap/cache`
- Nginx configuré pour le backend

### Frontend
- Dossier `/var/www/monbeaupays-frontend` créé
- Fichier `.env.production` avec `NEXT_PUBLIC_API_URL`
- `ecosystem.config.js` pour PM2
- Nginx configuré en reverse proxy vers `localhost:3000`

## 5. Configuration Nginx

Un exemple de configuration est dans `scripts/nginx-monbeaupays.conf`.

```bash
# Sur le serveur
sudo cp /var/www/monbeaupays-frontend/../scripts/nginx-monbeaupays.conf /etc/nginx/sites-available/monbeaupays
sudo ln -sf /etc/nginx/sites-available/monbeaupays /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Ordre recommandé (première installation)

1. Exécuter `setup-server.sh` sur le serveur
2. Créer la base MySQL et configurer `.env` (backend)
3. Premier déploiement backend : `./deploy-unified.sh --backend-only`
4. Configurer `.env.production` sur le serveur (frontend)
5. Premier déploiement frontend : `./deploy-unified.sh --frontend-only`
6. Démarrer PM2 : `ssh root@serveur 'cd /var/www/monbeaupays-frontend && pm2 start ecosystem.config.js'`

## 7. Déploiements suivants

```bash
# Mise à jour complète (les deux)
./deploy-unified.sh

# Ou validation interactive
./deploy-unified.sh
# Répondre O aux deux questions
```
