# Guide rapide OAuth - Google et Microsoft

## Étapes d'installation

### 1. Installer Laravel Socialite
```bash
cd backend
composer require laravel/socialite
```

### 2. Exécuter la migration
```bash
php artisan migrate
```

### 3. Configurer les variables d'environnement

Ajouter dans `.env` :

```env
# Google OAuth
GOOGLE_CLIENT_ID=votre_google_client_id
GOOGLE_CLIENT_SECRET=votre_google_client_secret
GOOGLE_REDIRECT_URI=https://apimonbeaupays.loyerpay.ci/api/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=votre_microsoft_client_id
MICROSOFT_CLIENT_SECRET=votre_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://apimonbeaupays.loyerpay.ci/api/auth/microsoft/callback
MICROSOFT_TENANT=common

# URL du frontend (pour la redirection après OAuth)
FRONTEND_URL=https://monbeaupays.loyerpay.ci
```

### 4. Obtenir les clés OAuth

#### Google
1. Aller sur https://console.cloud.google.com/
2. Créer un projet
3. Activer l'API Google+
4. Créer des identifiants OAuth 2.0
5. Ajouter l'URI de redirection : `https://apimonbeaupays.loyerpay.ci/api/auth/google/callback`

#### Microsoft
1. Aller sur https://portal.azure.com/
2. Azure Active Directory > App registrations
3. Nouvelle inscription
4. Type de compte : "Comptes dans n'importe quel annuaire d'organisation et comptes Microsoft personnels"
5. URI de redirection : `https://apimonbeaupays.loyerpay.ci/api/auth/microsoft/callback`
6. Créer un secret client

### 5. Tester

1. Aller sur `/auth/login`
2. Cliquer sur "Google" ou "Microsoft"
3. S'authentifier avec le compte OAuth
4. Être redirigé vers le dashboard

## Fonctionnalités

- ✅ Connexion via Google
- ✅ Connexion via Microsoft
- ✅ Création automatique de compte si l'email n'existe pas
- ✅ Liaison automatique si l'email existe déjà
- ✅ Vérification automatique de l'email
- ✅ Récupération de l'avatar depuis OAuth
- ✅ Possibilité de lier plusieurs comptes OAuth à un compte existant

## Routes API

- `GET /api/auth/google/redirect` - Redirige vers Google
- `GET /api/auth/google/callback` - Callback Google
- `GET /api/auth/microsoft/redirect` - Redirige vers Microsoft
- `GET /api/auth/microsoft/callback` - Callback Microsoft
- `POST /api/auth/{provider}/link` - Lier un compte OAuth (nécessite auth)
