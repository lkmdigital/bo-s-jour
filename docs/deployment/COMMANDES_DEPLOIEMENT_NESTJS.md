# 📋 Commandes de Déploiement NestJS - Guide Rapide

Guide condensé avec toutes les commandes nécessaires pour déployer NestJS sur Hostinger.

## 🚀 Déploiement Complet

### 1. Upload Direct sur le Serveur

**Via FTP/SFTP** :
- Uploadez **tout le contenu** du dossier `nestjs-admin/` vers `~/domains/votre-domaine.com/nestjs-admin/`
- Incluez : `dist/`, `package.json`, `package-lock.json`, `ecosystem.config.js`, `env.production.template`
- **Excluez** : `node_modules/`, `.env`, `logs/`

### 2. Sur le Serveur Hostinger (via SSH)

```bash
# Aller dans le dossier du projet
cd ~/domains/votre-domaine.com/nestjs-admin

# Créer le fichier .env
cp env.production.template .env
nano .env  # Éditer avec vos paramètres

# Installer les dépendances
npm install --production

# Installer PM2 (si pas déjà installé)
npm install -g pm2

# Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Suivre les instructions
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

## 🔄 Commandes de Gestion PM2

```bash
# Voir le statut
pm2 status

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

## 📤 Mise à Jour

**En local :**
```bash
cd nestjs-admin
git pull origin main  # OU mettre à jour le code
npm install
npm run build
# Uploadez les fichiers modifiés (dist/, package.json, etc.)
```

**Sur le serveur :**
```bash
cd ~/domains/votre-domaine.com/nestjs-admin
pm2 stop nestjs-admin
# Uploader les nouveaux fichiers via FTP/SFTP
npm install --production
npm run build  # Si nécessaire
pm2 restart nestjs-admin
pm2 logs nestjs-admin --lines 20
```

## ✅ Vérification

```bash
# Tester l'API
curl http://localhost:3001/api

# Tester avec token
curl -H "Authorization: Bearer VOTRE_TOKEN" \
     http://localhost:3001/api/admin/dashboard/stats
```

## 🐛 Dépannage Rapide

```bash
# Réinstaller dépendances
npm install --production

# Voir les erreurs
pm2 logs nestjs-admin --err

# Redémarrer avec plus de mémoire
pm2 restart nestjs-admin --max-memory-restart 2G

# Vérifier le port
lsof -i :3001
```

## 📝 Checklist

- [ ] Node.js 18+ installé
- [ ] PM2 installé
- [ ] Fichier .env configuré
- [ ] JWT_SECRET identique à Laravel
- [ ] LARAVEL_API_URL correct
- [ ] npm install --production
- [ ] npm run build
- [ ] pm2 start ecosystem.config.js
- [ ] pm2 save
- [ ] Application accessible

---

📖 Pour plus de détails, voir `DEPLOYMENT_NESTJS.md`

