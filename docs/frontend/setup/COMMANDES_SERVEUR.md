# Commandes à Exécuter sur le Serveur

Vous êtes **déjà connecté** au serveur (`root@srv1233008`). Exécutez ces commandes **directement** dans votre terminal SSH.

## 🚀 Commandes à Exécuter

Copiez-collez ces commandes **une par une** dans votre terminal SSH :

### 1. Aller dans le dossier frontend

```bash
cd /var/www/monbeaupays-frontend
```

### 2. Vérifier/Créer .env.production

```bash
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
EOF
```

### 3. Vérifier/Créer ecosystem.config.js

```bash
cat > ecosystem.config.js << 'EOF'
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
EOF
```

### 4. Vérifier que le build existe

```bash
ls -la .next
```

Si le dossier `.next` n'existe pas, créez le build :

```bash
npm run build
```

### 5. Démarrer avec PM2

```bash
# Si l'application existe déjà, la supprimer
pm2 delete monbeaupays-frontend 2>/dev/null || true

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save
```

### 6. Vérifier que ça fonctionne

```bash
# Vérifier le statut PM2
pm2 status

# Vérifier que le port 3000 est utilisé
netstat -tuln | grep 3000

# Tester Next.js
curl http://localhost:3000
```

## 🔍 Si ça ne fonctionne pas

### Voir les logs

```bash
pm2 logs monbeaupays-frontend --lines 50
```

### Vérifier les erreurs courantes

**Erreur : "Cannot find module"**
```bash
cd /var/www/monbeaupays-frontend
npm install
npm run build
pm2 restart monbeaupays-frontend
```

**Erreur : "Build not found"**
```bash
cd /var/www/monbeaupays-frontend
npm run build
pm2 restart monbeaupays-frontend
```

## ✅ Vérifications Finales

Après avoir démarré Next.js, vérifiez :

1. **PM2 Status** :
```bash
pm2 status
```
Vous devriez voir `monbeaupays-frontend` avec le statut `online`.

2. **Port 3000** :
```bash
netstat -tuln | grep 3000
```
Vous devriez voir le port 3000 utilisé.

3. **Next.js répond** :
```bash
curl http://localhost:3000
```
Vous devriez voir du HTML.

4. **Nginx fonctionne** :
```bash
curl http://localhost
```
Vous devriez voir la même chose que `curl http://localhost:3000`.

## 📝 Commandes Utiles

```bash
# Voir les logs en temps réel
pm2 logs monbeaupays-frontend

# Redémarrer l'application
pm2 restart monbeaupays-frontend

# Arrêter l'application
pm2 stop monbeaupays-frontend

# Voir le statut
pm2 status
```

