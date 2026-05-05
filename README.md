# MonBeauPays.com

Plateforme de réservation d'hébergements en Côte d'Ivoire - Version MVP

## 📋 Vue d'ensemble

MonBeauPays.com est une plateforme moderne et bilingue (FR/EN) dédiée à la gestion et à la réservation d'hébergements (hôtels, lodges, maisons d'hôtes, appartements) en Côte d'Ivoire.

## 🏗️ Architecture

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Laravel 11 (API mode)
- **Database**: MySQL
- **Authentication**: Laravel Sanctum
- **Image Storage**: Cloudinary (ou local)
- **Maps**: Google Maps API (à configurer)

## 📁 Structure du projet

```
monbeaupays.com/
├── backend/          # API Laravel
├── frontend/         # Application Next.js
├── database/         # Scripts SQL et migrations
└── docs/            # Documentation
```

## 🚀 Installation

### Prérequis

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL 8.0+
- npm ou yarn

### Backend (Laravel)

1. Naviguez vers le dossier backend :
```bash
cd backend
```

2. Installez les dépendances :
```bash
composer install
```

3. Copiez le fichier `.env.example` vers `.env` :
```bash
cp .env.example .env
```

4. Générez la clé d'application :
```bash
php artisan key:generate
```

5. Configurez votre base de données dans `.env` :
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=monbeaupays
DB_USERNAME=root
DB_PASSWORD=your_password
```

6. Exécutez les migrations et seeders :
```bash
php artisan migrate --seed
```

7. Démarrez le serveur :
```bash
php artisan serve
```

Le backend sera accessible sur `http://localhost:8000`

### Frontend (Next.js)

1. Naviguez vers le dossier frontend :
```bash
cd frontend
```

2. Installez les dépendances :
```bash
npm install
# ou
yarn install
```

3. Copiez le fichier `.env.example` vers `.env.local` :
```bash
cp .env.example .env.local
```

4. Configurez l'URL de l'API dans `.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

5. Démarrez le serveur de développement :
```bash
npm run dev
# ou
yarn dev
```

Le frontend sera accessible sur `http://localhost:3000`

## 👤 Comptes de test

Après avoir exécuté les seeders, vous pouvez vous connecter avec :

### Admin
- Email: `admin@monbeaupays.com`
- Password: `password`

### Host (Hôte)
- Email: `host1@monbeaupays.com`
- Password: `password`

### User (Utilisateur)
- Email: `user1@monbeaupays.com`
- Password: `password`

## 🔑 Fonctionnalités

### ✅ Implémentées (MVP)

- **Module Hébergements**
  - Liste des hébergements avec pagination
  - Recherche et filtres (ville, type, prix)
  - Page de détails avec photos, description, équipements
  - Gestion CRUD pour les hôtes

- **Système de réservation**
  - Formulaire de réservation avec dates et nombre de voyageurs
  - Vérification de disponibilité
  - Suivi du statut (pending/confirmed/cancelled)

- **Authentification**
  - Inscription / Connexion
  - Gestion des rôles (user, host, admin)
  - Protection des routes avec Sanctum

- **Dashboards**
  - Dashboard utilisateur (réservations)
  - Dashboard hôte (hébergements et réservations)
  - Dashboard admin (gestion de la plateforme)

- **Interface**
  - Design responsive (mobile, tablette, desktop)
  - Mode sombre/clair
  - Bilingue FR/EN (structure prête, traductions à compléter)

## 📚 API Documentation

Consultez le fichier `docs/API.md` pour la documentation complète de l'API.

### Endpoints principaux

- `GET /api/accommodations` - Liste des hébergements
- `GET /api/accommodations/{id}` - Détails d'un hébergement
- `POST /api/bookings` - Créer une réservation
- `GET /api/bookings` - Liste des réservations
- `POST /api/login` - Connexion
- `POST /api/register` - Inscription

## 🎨 Identité visuelle

- **Couleur primaire**: Vert (#007A3D)
- **Couleur accent**: Or (#FFD700)
- **Typographie**: Inter, Poppins, Open Sans

## 🔧 Configuration

### Cloudinary (optionnel)

Pour le stockage d'images, configurez dans `.env` du backend :
```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### Google Maps (optionnel)

Pour les cartes, configurez dans `.env` du backend et `.env.local` du frontend :
```env
GOOGLE_MAPS_API_KEY=your_api_key
```

## 📝 Notes

- Les images utilisent actuellement des URLs Unsplash en placeholder
- Les notifications email sont préparées mais non implémentées
- L'i18n est structuré mais nécessite l'intégration de next-intl

## 🛠️ Développement

### Commandes utiles

**Backend:**
```bash
php artisan migrate          # Exécuter les migrations
php artisan migrate:fresh --seed  # Réinitialiser la DB avec données
php artisan tinker           # Console interactive
```

**Frontend:**
```bash
npm run dev      # Développement
npm run build    # Build de production
npm run start    # Serveur de production
```

## 📄 Licence

MIT

## 👥 Contribution

Ce projet est en phase MVP. Les contributions sont les bienvenues !

