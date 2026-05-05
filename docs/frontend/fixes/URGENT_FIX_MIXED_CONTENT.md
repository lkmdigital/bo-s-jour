# 🚨 CORRECTION URGENTE : Erreur Mixed Content

## Problème

Le frontend essaie d'accéder à `http://72.62.16.236:8000/api/login` au lieu de `https://apimonbeaupays.loyerpay.ci/api/login`.

**Erreur** :
```
Mixed Content: The page at 'https://bosejour.ci/auth/login' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://72.62.16.236:8000/api/login'. 
This request has been blocked; the content must be served over HTTPS.
```

## ✅ Solution Immédiate

### Sur le serveur frontend (72.62.31.145) :

```bash
ssh root@72.62.31.145

cd /var/www/monbeaupays-frontend

# 1. Créer/corriger .env.production avec la BONNE URL HTTPS
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://apimonbeaupays.loyerpay.ci/api
NODE_ENV=production
EOF

# 2. Vérifier que c'est bien enregistré
cat .env.production

# 3. SUPPRIMER le build actuel (OBLIGATOIRE)
rm -rf .next

# 4. REBUILD (OBLIGATOIRE - Next.js intègre les variables au build)
npm run build

# 5. Redémarrer PM2
pm2 restart monbeaupays-frontend

# 6. Vérifier les logs
pm2 logs monbeaupays-frontend --lines 20
```

## ⚠️ IMPORTANT

**Le rebuild est OBLIGATOIRE** car Next.js intègre les variables d'environnement `NEXT_PUBLIC_*` au moment du **build**, pas au runtime.

Si vous ne rebuild pas, l'ancienne URL HTTP restera dans le code compilé.

## 🔍 Vérification

1. Ouvrez `https://bosejour.ci`
2. F12 > Console
3. Vérifiez qu'il n'y a **plus** d'erreur Mixed Content
4. F12 > Network
5. Essayez de vous connecter
6. Vérifiez que la requête `/api/login` va vers `https://apimonbeaupays.loyerpay.ci/api/login`

## 📋 Script Automatique

J'ai créé un script `fix-mixed-content.sh` que vous pouvez utiliser :

```bash
cd /var/www/monbeaupays-frontend
./fix-mixed-content.sh
```

## 🚨 Si le problème persiste

1. Videz le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)
2. Vérifiez que `.env.production` contient bien l'URL HTTPS
3. Vérifiez que le rebuild a bien été fait (`ls -la .next` doit montrer un dossier récent)
4. Vérifiez les logs PM2 pour voir s'il y a des erreurs



