# Correction : Port 3000 non utilisé

Le problème est que Next.js ne tourne pas sur le port 3000. Voici comment le corriger.

## 🚀 Solution Rapide

### Option 1 : Script Automatique (Recommandé)

```bash
cat /Users/lkmdigital/monbeaupays.com/frontend/start-nextjs.sh | ssh root@72.62.31.145 'bash -s'
```

### Option 2 : Correction Manuelle

```bash
ssh root@72.62.31.145

# Aller dans le dossier frontend
cd /var/www/monbeaupays-frontend

# 1. Vérifier que .env.production existe
cat .env.production
# Doit contenir:
# NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
# NODE_ENV=production

# 2. Vérifier que ecosystem.config.js existe
cat ecosystem.config.js

# 3. Vérifier que le build existe
ls -la .next

# Si le build n'existe pas:
npm run build

# 4. Démarrer avec PM2
pm2 start ecosystem.config.js

# OU si l'application existe déjà mais ne tourne pas:
pm2 restart monbeaupays-frontend

# 5. Sauvegarder la configuration PM2
pm2 save

# 6. Vérifier que ça tourne
pm2 status

# 7. Tester
curl http://localhost:3000
```

## 🔍 Vérifications

### 1. Vérifier que PM2 a démarré l'application

```bash
pm2 status
```

Vous devriez voir `monbeaupays-frontend` avec le statut `online`.

### 2. Vérifier que le port 3000 est utilisé

```bash
netstat -tuln | grep 3000
# ou
ss -tuln | grep 3000
```

### 3. Vérifier les logs en cas d'erreur

```bash
pm2 logs monbeaupays-frontend --lines 50
```

## 🐛 Problèmes Courants

### L'application ne démarre pas

**Erreur : "Cannot find module"**
```bash
# Réinstaller les dépendances
cd /var/www/monbeaupays-frontend
rm -rf node_modules
npm install
npm run build
pm2 restart monbeaupays-frontend
```

**Erreur : "Port 3000 already in use"**
```bash
# Trouver le processus qui utilise le port
lsof -i :3000
# ou
netstat -tulpn | grep 3000

# Arrêter le processus ou utiliser un autre port
pm2 delete monbeaupays-frontend
pm2 start ecosystem.config.js
```

**Erreur : "Build not found"**
```bash
cd /var/www/monbeaupays-frontend
npm run build
pm2 restart monbeaupays-frontend
```

### PM2 ne démarre pas l'application

```bash
# Vérifier le fichier ecosystem.config.js
cat /var/www/monbeaupays-frontend/ecosystem.config.js

# Vérifier que le chemin cwd est correct
# Il doit pointer vers /var/www/monbeaupays-frontend

# Démarrer manuellement pour voir les erreurs
cd /var/www/monbeaupays-frontend
npm run start
# Si ça fonctionne, arrêter (Ctrl+C) et redémarrer avec PM2
```

## ✅ Checklist

- [ ] Le fichier `.env.production` existe et est correct
- [ ] Le fichier `ecosystem.config.js` existe
- [ ] Le build existe (dossier `.next`)
- [ ] Les dépendances sont installées (`node_modules` existe)
- [ ] PM2 a démarré l'application (`pm2 status` montre `online`)
- [ ] Le port 3000 est utilisé (`netstat -tuln | grep 3000`)
- [ ] Next.js répond (`curl http://localhost:3000`)
- [ ] Nginx est configuré pour proxy vers `http://localhost:3000`

## 📝 Commandes Utiles

```bash
# Voir le statut PM2
pm2 status

# Voir les logs en temps réel
pm2 logs monbeaupays-frontend

# Redémarrer l'application
pm2 restart monbeaupays-frontend

# Arrêter l'application
pm2 stop monbeaupays-frontend

# Supprimer l'application
pm2 delete monbeaupays-frontend

# Vérifier le port 3000
netstat -tuln | grep 3000

# Tester Next.js
curl http://localhost:3000
```

