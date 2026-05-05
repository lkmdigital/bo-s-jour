# Guide pour utiliser l'API locale

## ✅ Fichier .env.local créé

Le fichier `.env.local` a été créé dans le dossier `frontend` avec la configuration suivante :
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🚀 Étapes pour utiliser l'API locale

### 1. Démarrer le serveur Laravel (Backend)

```bash
cd backend
php artisan serve
```

Le serveur sera accessible sur : `http://localhost:8000`

### 2. Vérifier que la route existe

Dans un autre terminal, vérifiez que la route est bien enregistrée :

```bash
cd backend
php artisan route:list | grep "accommodation"
```

Vous devriez voir :
```
GET|HEAD  api/analytics/host/accommodation/{id} AnalyticsController@accommodationStats
```

### 3. Redémarrer le serveur Next.js (Frontend)

Si votre serveur Next.js est déjà en cours d'exécution, arrêtez-le (Ctrl+C) et redémarrez-le :

```bash
cd frontend
npm run dev
```

**Important** : Next.js charge les variables d'environnement au démarrage, donc un redémarrage est nécessaire.

### 4. Tester

1. Ouvrez votre navigateur sur `http://localhost:3000` (ou le port configuré)
2. Connectez-vous en tant qu'hôte
3. Allez sur le dashboard hôte : `/dashboard/host`
4. Cliquez sur un établissement dans "Top hébergements" ou "Revenus par établissement"
5. La page de statistiques devrait se charger depuis l'API locale

## 🔍 Vérification

Pour vérifier que l'API locale est utilisée, ouvrez la console du navigateur (F12) et regardez les requêtes réseau. Les URLs devraient commencer par `http://localhost:8000/api` au lieu de `https://apimonbeaupays.loyerpay.ci/api`.

## 📝 Note

- Le fichier `.env.local` est dans `.gitignore`, il ne sera pas commité
- Pour revenir à l'API de production, supprimez ou renommez `.env.local`
- L'API locale doit avoir la même structure de base de données que la production pour fonctionner correctement

