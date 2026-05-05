# 🚀 Guide de Déploiement NestJS - Hostinger

Guide complet pour déployer le module NestJS Admin sur Hostinger.

## 📋 Prérequis

- Node.js 18+ installé sur le serveur
- npm ou yarn
- API Laravel déployée et accessible
- PM2 installé (pour gérer le processus en production)
- Accès SSH au serveur Hostinger

## 🔧 Étape 1 : Préparation en Local (Optionnel)

Si vous voulez build en local avant l'upload :

```bash
# Aller dans le dossier nestjs-admin
cd nestjs-admin

# Installer les dépendances
npm install

# Build pour la production
npm run build
```

Cela créera un dossier `dist/` avec le code compilé.

**Note** : Vous pouvez aussi build directement sur le serveur après l'upload.

## 📤 Étape 2 : Upload Direct sur le Serveur

### 2.1 Structure recommandée

Sur Hostinger, créez la structure suivante :

```
~/domains/votre-domaine.com/
├── api/              # Backend Laravel
├── app/              # Frontend Next.js
└── nestjs-admin/     # Module NestJS Admin
    ├── dist/         # Code compilé
    ├── node_modules/
    ├── package.json
    ├── ecosystem.config.js
    └── .env
```

### 2.2 Upload des fichiers

**Via FTP/SFTP** :
1. Uploadez **tout le contenu** du dossier `nestjs-admin/` vers `~/domains/votre-domaine.com/nestjs-admin/`
2. Incluez tous les fichiers : `dist/`, `package.json`, `package-lock.json`, `ecosystem.config.js`, `env.production.template`, etc.
3. **Excluez** : `node_modules/` (sera installé sur le serveur), `.env` (sera créé sur le serveur), `logs/` (sera créé)

**Fichiers à uploader** :
- ✅ `dist/` (ou build sur le serveur)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `ecosystem.config.js`
- ✅ `env.production.template`
- ✅ `tsconfig.json`
- ✅ `nest-cli.json`
- ❌ `node_modules/` (installé sur le serveur)
- ❌ `.env` (créé sur le serveur)
- ❌ `logs/` (créé sur le serveur)

## ⚙️ Étape 3 : Configuration

### 3.1 Créer le fichier .env

```bash
cd ~/domains/votre-domaine.com/nestjs-admin
nano .env
```

Contenu du fichier `.env` :

```env
# Port de l'application NestJS
PORT=3001

# Environnement
NODE_ENV=production

# JWT - DOIT être identique à celui de Laravel
JWT_SECRET=votre-secret-jwt-identique-a-laravel
JWT_EXPIRES_IN=24h

# URL de l'API Laravel (production)
LARAVEL_API_URL=https://apimonbeaupays.loyerpay.ci/api

# URL du frontend (pour CORS)
FRONTEND_URL=https://monbeaupays.com
```

⚠️ **IMPORTANT** : `JWT_SECRET` doit être **identique** à celui configuré dans Laravel (`APP_KEY` ou `JWT_SECRET` dans Laravel).

### 3.2 Installer les dépendances sur le serveur

```bash
cd ~/domains/votre-domaine.com/nestjs-admin

# Installer uniquement les dépendances de production
npm install --production

# OU si vous avez déjà uploadé node_modules, vérifiez :
npm ci --production
```

## 🏗️ Étape 4 : Build sur le Serveur (si nécessaire)

Si vous n'avez pas build en local :

```bash
cd ~/domains/votre-domaine.com/nestjs-admin

# Installer toutes les dépendances (y compris dev)
npm install

# Build
npm run build

# Supprimer les dépendances de développement
npm prune --production
```

## 🚀 Étape 5 : Démarrage avec PM2

PM2 est un gestionnaire de processus pour Node.js qui maintient l'application en vie.

### 5.1 Installation de PM2

```bash
# Installer PM2 globalement
npm install -g pm2
```

### 5.2 Créer un fichier de configuration PM2

Créez `ecosystem.config.js` dans le dossier `nestjs-admin/` :

```javascript
module.exports = {
  apps: [{
    name: 'nestjs-admin',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### 5.3 Créer le dossier de logs

```bash
mkdir -p logs
```

### 5.4 Démarrer avec PM2

```bash
cd ~/domains/votre-domaine.com/nestjs-admin

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

### 5.5 Commandes PM2 utiles

```bash
# Voir les processus
pm2 list

# Voir les logs
pm2 logs nestjs-admin

# Redémarrer
pm2 restart nestjs-admin

# Arrêter
pm2 stop nestjs-admin

# Supprimer
pm2 delete nestjs-admin

# Monitoring
pm2 monit
```

## 🌐 Étape 6 : Configuration Apache/Nginx

### 6.1 Configuration Apache (Proxy Reverse)

Si vous voulez accéder à NestJS via un sous-domaine ou un chemin spécifique, configurez Apache :

**Pour un sous-domaine** (`admin-api.monbeaupays.com`) :

Créez un fichier `.htaccess` ou configurez dans le VirtualHost :

```apache
<VirtualHost *:80>
    ServerName admin-api.monbeaupays.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass / http://localhost:3001/api/
    ProxyPassReverse / http://localhost:3001/api/
    
    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

**Pour un chemin** (`/admin-api`) :

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^admin-api/(.*)$ http://localhost:3001/api/$1 [P,L]
</IfModule>
```

### 6.2 Configuration Nginx (si disponible)

```nginx
location /admin-api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## ✅ Étape 7 : Vérification

### 7.1 Vérifier que l'application tourne

```bash
# Vérifier avec PM2
pm2 status

# Vérifier les logs
pm2 logs nestjs-admin --lines 50

# Tester l'API
curl http://localhost:3001/api
```

### 7.2 Tester avec un token JWT

```bash
# Obtenir un token depuis Laravel (via login)
TOKEN="votre-token-jwt"

# Tester un endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/admin/dashboard/stats
```

### 7.3 Vérifier la connexion à Laravel

Vérifiez dans les logs que NestJS arrive à communiquer avec Laravel :

```bash
pm2 logs nestjs-admin | grep -i "laravel\|error"
```

## 🔄 Étape 8 : Mise à Jour

### 8.1 Processus de mise à jour

**En local :**
```bash
# Aller dans nestjs-admin
cd nestjs-admin

# Mettre à jour le code (si Git)
git pull origin main

# Installer les nouvelles dépendances
npm install

# Rebuild
npm run build

# Uploadez les fichiers modifiés via FTP/SFTP
# (dist/, package.json, package-lock.json, etc.)
```

**Sur le serveur :**
```bash
# Se connecter en SSH
ssh user@votre-serveur

# Aller dans le dossier
cd ~/domains/votre-domaine.com/nestjs-admin

# Arrêter l'application
pm2 stop nestjs-admin

# Installer les nouvelles dépendances (si package.json modifié)
npm install --production

# Rebuild si nécessaire (si le code source a changé)
npm run build

# Redémarrer
pm2 restart nestjs-admin

# Vérifier les logs
pm2 logs nestjs-admin --lines 20
```

## 🐛 Dépannage

### Erreur : "Cannot find module"

```bash
# Réinstaller les dépendances
npm install --production

# Vérifier que dist/ existe
ls -la dist/
```

### Erreur : "Port already in use"

```bash
# Vérifier quel processus utilise le port
lsof -i :3001

# Changer le port dans .env et ecosystem.config.js
```

### Erreur : "JWT verification failed"

- Vérifiez que `JWT_SECRET` dans NestJS est **identique** à celui de Laravel
- Vérifiez que le token est valide et non expiré

### Erreur : "Cannot connect to Laravel API"

```bash
# Tester la connexion à Laravel
curl https://api.monbeaupays.com/api/accommodations

# Vérifier LARAVEL_API_URL dans .env
cat .env | grep LARAVEL_API_URL
```

### Application qui crash

```bash
# Voir les logs d'erreur
pm2 logs nestjs-admin --err

# Redémarrer avec plus de mémoire
pm2 restart nestjs-admin --update-env --max-memory-restart 2G
```

## 📊 Monitoring

### Surveiller les performances

```bash
# Monitoring en temps réel
pm2 monit

# Statistiques
pm2 describe nestjs-admin
```

### Logs

Les logs sont disponibles dans :
- `logs/out.log` - Sortie standard
- `logs/err.log` - Erreurs
- Ou via `pm2 logs nestjs-admin`

## 🔐 Sécurité

### Variables d'environnement

- ⚠️ Ne jamais commiter le fichier `.env`
- ⚠️ Utiliser des secrets forts pour `JWT_SECRET`
- ⚠️ Limiter l'accès au port 3001 (firewall)

### Firewall

Si possible, configurez le firewall pour que seul Apache/Nginx puisse accéder au port 3001 :

```bash
# Exemple avec ufw (si disponible)
ufw allow from 127.0.0.1 to any port 3001
```

## 📝 Checklist de Déploiement

- [ ] Node.js 18+ installé
- [ ] PM2 installé
- [ ] Fichier `.env` créé et configuré
- [ ] `JWT_SECRET` identique à Laravel
- [ ] `LARAVEL_API_URL` pointant vers l'API Laravel en production
- [ ] Dépendances installées (`npm install --production`)
- [ ] Build créé (`npm run build`)
- [ ] Application démarrée avec PM2
- [ ] PM2 configuré pour démarrer au boot
- [ ] Apache/Nginx configuré (si nécessaire)
- [ ] Application accessible et fonctionnelle
- [ ] Logs vérifiés
- [ ] Test avec token JWT réussi

## 🎯 Commandes Rapides

```bash
# Démarrage complet
cd ~/domains/votre-domaine.com/nestjs-admin
npm install --production
npm run build
pm2 start ecosystem.config.js
pm2 save

# Redémarrage
pm2 restart nestjs-admin

# Voir les logs
pm2 logs nestjs-admin

# Arrêter
pm2 stop nestjs-admin
```

---

**Bon déploiement ! 🚀**

