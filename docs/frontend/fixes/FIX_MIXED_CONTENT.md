# Correction : Erreur Mixed Content

## 🔍 Problème

Le frontend (HTTPS) essaie d'accéder à l'API en HTTP :
```
Mixed Content: The page at 'https://bosejour.ci/auth/login' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://72.62.16.236:8000/api/login'. 
This request has been blocked; the content must be served over HTTPS.
```

## ✅ Solution

### Sur le serveur frontend :

```bash
ssh root@72.62.31.145

cd /var/www/monbeaupays-frontend

# Exécuter le script de correction
./fix-mixed-content.sh
```

OU manuellement :

```bash
cd /var/www/monbeaupays-frontend

# 1. Créer/corriger .env.production
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
EOF

# 2. Rebuild (OBLIGATOIRE)
rm -rf .next
npm run build

# 3. Redémarrer
pm2 restart monbeaupays-frontend

# 4. Vérifier
pm2 logs monbeaupays-frontend --lines 20
```

## ⚠️ Important

**Le rebuild est OBLIGATOIRE** car Next.js intègre les variables d'environnement (`NEXT_PUBLIC_*`) au moment du build, pas au runtime.

## 🔍 Vérification

1. Ouvrez `https://bosejour.ci`
2. F12 > Console
3. Vérifiez qu'il n'y a plus d'erreur Mixed Content
4. Essayez de vous connecter
5. Dans Network, vérifiez que les requêtes API vont vers `https://apimonbeaupays.loyerpay.ci/api`

## 📋 Pourquoi cette erreur ?

- Le site est en HTTPS (`https://bosejour.ci`)
- Le navigateur bloque les requêtes HTTP depuis une page HTTPS (sécurité)
- L'ancienne URL `http://72.62.16.236:8000` était encore dans le build
- Il faut rebuilder avec la bonne URL HTTPS

## 🚨 Si le problème persiste

1. Vérifiez que `.env.production` contient bien l'URL HTTPS
2. Vérifiez que le rebuild a bien été fait (`rm -rf .next && npm run build`)
3. Vérifiez que PM2 a bien redémarré
4. Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
