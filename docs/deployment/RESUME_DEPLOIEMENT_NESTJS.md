# 📦 Résumé Déploiement NestJS - Processus Simplifié

## 🎯 Processus en 2 Étapes

### 1️⃣ Upload Direct sur le Serveur

**Via FTP/SFTP** :
- Uploadez **tout le contenu** du dossier `nestjs-admin/` vers `~/domains/votre-domaine.com/nestjs-admin/`
- Incluez : `dist/`, `package.json`, `package-lock.json`, `ecosystem.config.js`, `env.production.template`
- **Excluez** : `node_modules/`, `.env`, `logs/` (seront créés sur le serveur)

### 2️⃣ Configuration et Démarrage sur le Serveur

```bash
# Se connecter en SSH
ssh user@votre-serveur

# Aller dans le dossier
cd ~/domains/votre-domaine.com/nestjs-admin

# Créer le fichier .env
cp env.production.template .env
nano .env  # Configurer avec vos paramètres

# Configuration .env minimale :
# PORT=3001
# NODE_ENV=production
# JWT_SECRET=votre-secret-identique-a-laravel
# JWT_EXPIRES_IN=24h
# LARAVEL_API_URL=https://apimonbeaupays.loyerpay.ci/api
# FRONTEND_URL=https://monbeaupays.com

# Installer les dépendances
npm install --production

# Build (si pas fait en local)
npm run build

# Installer PM2
npm install -g pm2

# Démarrer
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## ✅ Vérification

```bash
# Vérifier que ça tourne
pm2 status

# Voir les logs
pm2 logs nestjs-admin

# Tester l'API
curl http://localhost:3001/api
```

## 🔄 Mise à Jour

```bash
# Sur le serveur
cd ~/domains/votre-domaine.com/nestjs-admin
pm2 stop nestjs-admin

# Uploader les nouveaux fichiers via FTP/SFTP
# (dist/, package.json, etc.)

# Installer dépendances si nécessaire
npm install --production

# Rebuild si nécessaire
npm run build

# Redémarrer
pm2 restart nestjs-admin
pm2 logs nestjs-admin --lines 20
```

## ⚙️ Configuration .env

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=votre-secret-identique-a-laravel
JWT_EXPIRES_IN=24h
LARAVEL_API_URL=https://apimonbeaupays.loyerpay.ci/api
FRONTEND_URL=https://monbeaupays.com
```

⚠️ **IMPORTANT** : `JWT_SECRET` doit être **identique** à celui configuré dans Laravel.

---

📖 Pour plus de détails, voir `DEPLOYMENT_NESTJS.md` ou `COMMANDES_DEPLOIEMENT_NESTJS.md`
