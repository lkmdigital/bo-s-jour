# Guide de configuration rapide - MonBeauPays.com

## 🚀 Démarrage rapide

### Étape 1: Configuration de la base de données

1. Créez une base de données MySQL :
```sql
CREATE DATABASE monbeaupays CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Configurez les credentials dans `backend/.env` :
```env
DB_DATABASE=monbeaupays
DB_USERNAME=root
DB_PASSWORD=votre_mot_de_passe
```

### Étape 2: Backend Laravel

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Le backend sera accessible sur `http://localhost:8000`

### Étape 3: Frontend Next.js

```bash
cd frontend
npm install
cp .env.example .env.local
# Éditez .env.local et configurez NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

## ✅ Vérification

1. Ouvrez `http://localhost:3000` dans votre navigateur
2. Vous devriez voir la page d'accueil avec des hébergements
3. Testez la connexion avec :
   - Email: `admin@monbeaupays.com`
   - Password: `password`

## 🔧 Dépannage

### Erreur de connexion à la base de données
- Vérifiez que MySQL est démarré
- Vérifiez les credentials dans `.env`
- Assurez-vous que la base de données existe

### Erreur CORS
- Vérifiez que `SANCTUM_STATEFUL_DOMAINS` dans `backend/.env` inclut `localhost:3000`
- Vérifiez la configuration dans `backend/config/cors.php`

### Erreur 404 sur les routes API
- Vérifiez que le serveur Laravel est démarré
- Vérifiez que l'URL dans `frontend/.env.local` est correcte

## 📝 Notes importantes

- Les images utilisent des URLs Unsplash en placeholder
- Pour la production, configurez Cloudinary ou un autre service de stockage
- Configurez Google Maps API pour les fonctionnalités de carte
- Les emails sont désactivés par défaut (configurez dans `.env` pour la production)

