# 🔧 Fix : Cannot read properties of undefined (reading 'clientModules')

## 🐛 Erreur
```
TypeError: Cannot read properties of undefined (reading 'clientModules')
```

## 🎯 Cause
Cette erreur Next.js se produit généralement quand :
1. Le cache Next.js est corrompu
2. Un nouveau composant/dossier a été ajouté pendant que le serveur tourne
3. Hot reload ne fonctionne pas correctement

## ✅ Solutions

### Solution 1 : Nettoyer le cache et redémarrer (RECOMMANDÉ)

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend

# 1. Arrêter le serveur Next.js (Ctrl+C)

# 2. Supprimer les caches
rm -rf .next
rm -rf node_modules/.cache

# 3. Redémarrer
npm run dev
```

### Solution 2 : Vérifier le port 3000

Si le port 3000 est occupé :

```bash
# Trouver le processus sur le port 3000
lsof -ti:3000

# Le tuer
kill -9 $(lsof -ti:3000)

# Redémarrer
npm run dev
```

### Solution 3 : Réinstaller les dépendances (si le problème persiste)

```bash
cd /Users/lkmdigital/monbeaupays.com/frontend

# Supprimer node_modules
rm -rf node_modules

# Réinstaller
npm install

# Redémarrer
npm run dev
```

### Solution 4 : Vérifier les imports

Le composant `RoomStatsCard` doit être correctement importé :

```typescript
// ✅ Correct
import RoomStatsCard from '@/components/dashboard/RoomStatsCard';

// ❌ Incorrect
import { RoomStatsCard } from '@/components/dashboard/RoomStatsCard';
```

## 🧪 Test

Après avoir redémarré, ouvrez :
```
http://localhost:3000/dashboard/host
```

**Résultat attendu** :
- ✅ Page se charge sans erreur
- ✅ Pas de message "clientModules" dans la console
- ✅ Dashboard fonctionnel

## 📝 Prévention

Pour éviter cette erreur à l'avenir :

1. **Toujours redémarrer** après avoir ajouté de nouveaux dossiers/fichiers
2. **Nettoyer le cache** régulièrement :
   ```bash
   rm -rf .next
   ```
3. **Utiliser** `npm run dev` plutôt que `next dev` directement

## 🚨 Si le problème persiste

### Vérifier les logs complets
```bash
# Dans le terminal où tourne Next.js, cherchez :
- "Error: Module not found"
- "Cannot resolve"
- Stack trace complet
```

### Vérifier la structure des fichiers
```
frontend/
├── components/
│   └── dashboard/
│       └── RoomStatsCard.tsx  ✅ Doit exister
├── app/
│   └── dashboard/
│       └── host/
│           └── page.tsx
```

### Vérifier tsconfig.json
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

**Date** : 2026-01-21  
**Erreur** : clientModules undefined  
**Solution** : Nettoyage cache + redémarrage
