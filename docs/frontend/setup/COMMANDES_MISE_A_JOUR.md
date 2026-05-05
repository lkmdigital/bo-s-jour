# Commandes de Mise à Jour

## 🚀 Mise à Jour Rapide (Script Automatique)

### Depuis votre machine locale :

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend
./update-frontend.sh
```

## 📝 Commandes Manuelles

### Option 1 : Depuis votre machine locale

```bash
# Aller dans le dossier frontend
cd /Users/lkmdigital/monbeaupays.com/frontend

# Transférer les fichiers
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude '.DS_Store' \
           --exclude '*.log' \
           --exclude '.env.local' \
           ./ root@72.62.31.145:/var/www/monbeaupays-frontend/

# Installer les dépendances et rebuild
ssh root@72.62.31.145 "cd /var/www/monbeaupays-frontend && \
    npm ci --production=false && \
    rm -rf .next && \
    npm run build && \
    pm2 restart monbeaupays-frontend"
```

### Option 2 : Directement sur le serveur

```bash
# Se connecter au serveur
ssh root@72.62.31.145

# Aller dans le dossier frontend
cd /var/www/monbeaupays-frontend

# Récupérer les dernières modifications (si vous utilisez git)
git pull origin main

# OU transférer les fichiers depuis votre machine locale d'abord

# Installer les dépendances
npm ci --production=false

# Supprimer l'ancien build
rm -rf .next

# Rebuild
npm run build

# Redémarrer PM2
pm2 restart monbeaupays-frontend

# Vérifier les logs
pm2 logs monbeaupays-frontend --lines 20
```

## 🔄 Mise à Jour Rapide (Uniquement le Rebuild)

Si vous avez déjà transféré les fichiers :

```bash
ssh root@72.62.31.145 "cd /var/www/monbeaupays-frontend && \
    rm -rf .next && \
    npm run build && \
    pm2 restart monbeaupays-frontend"
```

## ✅ Vérifications Après Mise à Jour

```bash
# Vérifier PM2
ssh root@72.62.31.145 "pm2 status"

# Vérifier les logs
ssh root@72.62.31.145 "pm2 logs monbeaupays-frontend --lines 20"

# Tester le site
curl https://bosejour.ci
```

## 📋 Checklist

- [ ] Fichiers transférés sur le serveur
- [ ] Dépendances installées (`npm ci`)
- [ ] Ancien build supprimé (`rm -rf .next`)
- [ ] Nouveau build créé (`npm run build`)
- [ ] PM2 redémarré (`pm2 restart monbeaupays-frontend`)
- [ ] Site accessible et fonctionnel

## 🐛 En Cas d'Erreur

### Erreur lors du build

```bash
# Voir les logs détaillés
ssh root@72.62.31.145 "cd /var/www/monbeaupays-frontend && npm run build 2>&1 | tail -n 50"
```

### Erreur PM2

```bash
# Voir les logs PM2
ssh root@72.62.31.145 "pm2 logs monbeaupays-frontend --lines 50"

# Redémarrer manuellement
ssh root@72.62.31.145 "cd /var/www/monbeaupays-frontend && pm2 delete monbeaupays-frontend && pm2 start ecosystem.config.js"
```

### Le site ne se met pas à jour

```bash
# Vider le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
# Vérifier que le build est récent
ssh root@72.62.31.145 "ls -la /var/www/monbeaupays-frontend/.next"
```

