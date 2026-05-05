# Configuration Progressive Web App (PWA)

Guide complet pour la configuration et le déploiement de la PWA.

## 📋 Fichiers Créés

1. **`public/manifest.json`** - Manifest de l'application
2. **`public/sw.js`** - Service Worker pour le cache et l'offline
3. **`app/manifest.ts`** - Manifest TypeScript (Next.js 14+)
4. **`components/pwa/PWAInstallPrompt.tsx`** - Composant pour l'installation
5. **`components/pwa/ServiceWorkerRegistration.tsx`** - Enregistrement du Service Worker

## 🎨 Icônes PWA Requises

Vous devez créer des icônes dans `public/icons/` :

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png` (iOS)
- `icon-192x192.png` (Android)
- `icon-384x384.png`
- `icon-512x512.png` (Splash screen)

### Génération des Icônes

1. **Utiliser le logo** : `public/images/payment-methods/logo/logo.png`
2. **Outils recommandés** :
   - [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [PWA Builder](https://www.pwabuilder.com/imageGenerator)

### Commande pour générer les icônes (si vous avez ImageMagick)

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend/public
mkdir -p icons

# Convertir le logo en différentes tailles
convert images/payment-methods/logo/logo.png -resize 72x72 icons/icon-72x72.png
convert images/payment-methods/logo/logo.png -resize 96x96 icons/icon-96x96.png
convert images/payment-methods/logo/logo.png -resize 128x128 icons/icon-128x128.png
convert images/payment-methods/logo/logo.png -resize 144x144 icons/icon-144x144.png
convert images/payment-methods/logo/logo.png -resize 152x152 icons/icon-152x152.png
convert images/payment-methods/logo/logo.png -resize 192x192 icons/icon-192x192.png
convert images/payment-methods/logo/logo.png -resize 384x384 icons/icon-384x384.png
convert images/payment-methods/logo/logo.png -resize 512x512 icons/icon-512x512.png
```

## ✅ Fonctionnalités PWA

### 1. Installation
- Prompt d'installation automatique
- Installation sur mobile et desktop
- Icônes sur l'écran d'accueil

### 2. Mode Offline
- Service Worker pour le cache
- Pages mises en cache pour consultation hors ligne
- Stratégie Network First pour les pages HTML
- Stratégie Cache First pour les assets statiques

### 3. Performance
- Cache des ressources statiques
- Chargement rapide des pages visitées
- Mise à jour automatique du cache

### 4. Expérience Native
- Affichage en mode standalone (sans barre d'adresse)
- Thème color personnalisé
- Support iOS et Android

## 🔧 Configuration

### Vérifications

1. **HTTPS requis** : La PWA nécessite HTTPS (déjà configuré avec Let's Encrypt)
2. **Service Worker** : Enregistré automatiquement au chargement
3. **Manifest** : Lié dans le layout

### Test Local

```bash
# Démarrer en mode développement
npm run dev

# Tester avec Lighthouse
# Ouvrir Chrome DevTools > Lighthouse > PWA
```

## 📱 Test sur Mobile

1. Ouvrir `https://bosejour.ci` sur mobile
2. Le navigateur devrait proposer "Ajouter à l'écran d'accueil"
3. L'app s'ouvre en mode standalone après installation

## 🚀 Déploiement

Après avoir créé les icônes :

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend
./update-frontend.sh
```

## ✅ Checklist

- [ ] Icônes PWA créées dans `public/icons/`
- [ ] Manifest.json configuré
- [ ] Service Worker enregistré
- [ ] Test d'installation réussi
- [ ] Test mode offline réussi
- [ ] Lighthouse PWA score > 90

## 🔍 Vérification

### Chrome DevTools

1. Ouvrir DevTools (F12)
2. Onglet "Application" > "Service Workers"
3. Vérifier que le Service Worker est actif
4. Onglet "Application" > "Manifest"
5. Vérifier que le manifest est chargé

### Lighthouse

1. Ouvrir DevTools > Lighthouse
2. Sélectionner "Progressive Web App"
3. Lancer l'audit
4. Vérifier le score (objectif : > 90)

## 📝 Notes

- Le Service Worker met en cache les pages visitées
- Les requêtes API ne sont pas mises en cache (toujours au réseau)
- Les mises à jour du Service Worker sont automatiques
- L'utilisateur peut choisir d'installer ou non l'app



