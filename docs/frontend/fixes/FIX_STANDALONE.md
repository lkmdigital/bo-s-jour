# Correction : Configuration Standalone

Le problème est que Next.js est configuré avec `output: standalone` mais PM2 utilise `next start` qui ne fonctionne pas avec cette configuration.

## 🔧 Solution

### Sur le serveur, exécutez ces commandes :

```bash
cd /var/www/monbeaupays-frontend

# 1. Corriger ecosystem.config.js pour utiliser standalone
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'monbeaupays-frontend',
    script: 'node',
    args: '.next/standalone/server.js',
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

# 2. Vérifier que le build standalone existe
ls -la .next/standalone/server.js

# Si le fichier n'existe pas, refaire le build
if [ ! -f .next/standalone/server.js ]; then
    npm run build
fi

# 3. Redémarrer PM2 avec la nouvelle configuration
pm2 delete monbeaupays-frontend
pm2 start ecosystem.config.js
pm2 save

# 4. Vérifier que ça fonctionne
pm2 status
curl http://localhost:3000
```

## 📝 Explication

Avec `output: standalone` dans `next.config.js`, Next.js crée un serveur standalone dans `.next/standalone/server.js`. Il faut donc utiliser `node .next/standalone/server.js` au lieu de `next start`.

## ✅ Vérifications

```bash
# Vérifier PM2
pm2 status

# Vérifier le port 3000
netstat -tuln | grep 3000

# Tester Next.js
curl http://localhost:3000

# Voir les logs
pm2 logs monbeaupays-frontend --lines 20
```

