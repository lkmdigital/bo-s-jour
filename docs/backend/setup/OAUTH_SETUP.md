# Configuration OAuth (Google et Microsoft)

## Installation

1. Installer Laravel Socialite :
```bash
composer require laravel/socialite
```

2. Exécuter la migration :
```bash
php artisan migrate
```

## Configuration Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API "Google+ API" (ou utiliser l'API People)
4. Aller dans "Credentials" > "Create Credentials" > "OAuth client ID"
5. Choisir "Web application"
6. Ajouter les URI de redirection autorisés :
   - `https://apimonbeaupays.loyerpay.ci/api/auth/google/callback`
   - `http://localhost:8000/api/auth/google/callback` (pour le développement local)
7. Copier le Client ID et le Client Secret

## Configuration Microsoft OAuth

1. Aller sur [Azure Portal](https://portal.azure.com/)
2. Aller dans "Azure Active Directory" > "App registrations"
3. Cliquer sur "New registration"
4. Remplir les informations :
   - Name: MonBeauPays
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `https://apimonbeaupays.loyerpay.ci/api/auth/microsoft/callback`
5. Après la création, aller dans "Certificates & secrets"
6. Créer un nouveau "Client secret"
7. Copier l'Application (client) ID et le Client secret

## Variables d'environnement

Ajouter ces variables dans votre fichier `.env` :

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://apimonbeaupays.loyerpay.ci/api/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=https://apimonbeaupays.loyerpay.ci/api/auth/microsoft/callback
MICROSOFT_TENANT=common
```

## Routes disponibles

- `GET /api/auth/google/redirect` - Redirige vers Google pour l'authentification
- `GET /api/auth/google/callback` - Callback après authentification Google
- `GET /api/auth/microsoft/redirect` - Redirige vers Microsoft pour l'authentification
- `GET /api/auth/microsoft/callback` - Callback après authentification Microsoft
- `POST /api/auth/{provider}/link` - Lier un compte OAuth à un compte existant (nécessite authentification)

## Utilisation dans le frontend

Le callback OAuth retourne un JSON avec `user`, `token`, et `provider`. Le frontend doit :
1. Stocker le token dans localStorage
2. Stocker l'utilisateur dans localStorage
3. Rediriger vers le dashboard approprié

## Notes importantes

- Les utilisateurs créés via OAuth ont leur email vérifié automatiquement
- Si un utilisateur existe déjà avec le même email, le compte OAuth sera lié
- Les utilisateurs peuvent lier plusieurs comptes OAuth à leur compte principal
- Le mot de passe est généré aléatoirement pour les comptes OAuth (l'utilisateur ne le connaîtra jamais)
