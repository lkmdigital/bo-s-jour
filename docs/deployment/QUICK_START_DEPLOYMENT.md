# Guide de Déploiement Rapide - VPS 72.62.31.145

Guide rapide pour déployer MonBeauPays en 10 minutes.

## 🚀 Déploiement Rapide

### Étape 1 : Configuration Initiale du Serveur

```bash
# Se connecter au serveur
ssh root@72.62.31.145

# Exécuter le script de configuration (depuis votre machine locale)
cat setup-server.sh | ssh root@72.62.31.145 'bash -s'

# OU copier le script sur le serveur et l'exécuter
scp setup-server.sh root@72.62.31.145:/root/
ssh root@72.62.31.145 'bash /root/setup-server.sh'
```

### Étape 2 : Configuration MySQL

```bash
# Sur le serveur
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

### Étape 3 : Déploiement du Backend

```bash
# Depuis votre machine locale, dans le dossier backend
cd /Users/lkmdigital/monbeaupays.com/backend
./deploy.sh
```

### Étape 4 : Configuration du Backend sur le Serveur

```bash
# Se connecter au serveur
ssh root@72.62.31.145

# Aller dans le dossier backend
cd /var/www/monbeaupays-backend

# Créer le fichier .env
cp env.production.template .env
nano .env

# Configurer les variables (voir le guide complet)
# Générer la clé
php artisan key:generate

# Configurer les permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Exécuter les migrations
php artisan migrate --force

# Optimiser
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Étape 5 : Configuration Nginx pour le Backend

```bash
# Sur le serveur
nano /etc/nginx/sites-available/monbeaupays-backend
```

Copier la configuration depuis le guide complet, puis :

```bash
ln -s /etc/nginx/sites-available/monbeaupays-backend /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Étape 6 : Déploiement du Frontend

```bash
# Depuis votre machine locale, dans le dossier frontend
cd /Users/lkmdigital/monbeaupays.com/frontend
./deploy-new-vps.sh
```

### Étape 7 : Configuration du Frontend sur le Serveur

```bash
# Se connecter au serveur
ssh root@72.62.31.145

# Aller dans le dossier frontend
cd /var/www/monbeaupays-frontend

# Créer le fichier .env.production
echo 'NEXT_PUBLIC_API_URL=http://72.62.31.145/api' > .env.production
echo 'NODE_ENV=production' >> .env.production

# Créer le fichier ecosystem.config.js (voir le guide complet)
nano ecosystem.config.js

# Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Suivre les instructions
```

### Étape 8 : Configuration Nginx pour le Frontend

```bash
# Sur le serveur
nano /etc/nginx/sites-available/monbeaupays
```

Copier la configuration depuis le guide complet, puis :

```bash
ln -s /etc/nginx/sites-available/monbeaupays /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Étape 9 : Vérification

```bash
# Tester le backend
curl http://72.62.31.145/api/accommodations

# Tester le frontend
curl http://72.62.31.145

# Vérifier les services
pm2 status
systemctl status nginx
systemctl status php8.2-fpm
```

## 📝 Commandes Utiles

### Voir les logs

```bash
# Backend
tail -f /var/www/monbeaupays-backend/storage/logs/laravel.log

# Frontend
pm2 logs monbeaupays-frontend

# Nginx
tail -f /var/log/nginx/error.log
```

### Redémarrer les services

```bash
# Backend
systemctl restart php8.2-fpm
systemctl reload nginx

# Frontend
pm2 restart monbeaupays-frontend
```

## 🔄 Mise à jour

### Backend

```bash
cd /Users/lkmdigital/monbeaupays.com/backend
./deploy.sh
```

### Frontend

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend
./deploy-new-vps.sh
```

---

Pour plus de détails, consultez `DEPLOYMENT_VPS_72.62.31.145.md`
