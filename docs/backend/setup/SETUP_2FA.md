# Configuration de l'Authentification à Deux Facteurs (2FA)

Guide complet pour mettre en place l'authentification à deux facteurs sur votre application.

## 📋 Prérequis

### 1. Installer la dépendance Google2FA

Sur le serveur backend, exécutez :

```bash
cd public_html/apibackend
composer require pragmarx/google2fa
```

OU ajoutez dans `composer.json` :

```json
"require": {
    "pragmarx/google2fa": "^8.0"
}
```

Puis exécutez `composer install`.

### 2. Téléverser les fichiers

Téléversez via FTP/cPanel :

1. **Migration** :
   - `database/migrations/2025_01_02_000001_add_two_factor_auth_to_users_table.php`

2. **Service** :
   - `app/Services/TwoFactorService.php`

3. **Contrôleur** :
   - `app/Http/Controllers/TwoFactorController.php`

4. **Modèle User** (mise à jour) :
   - `app/Models/User.php`

5. **Contrôleur Auth** (mise à jour) :
   - `app/Http/Controllers/AuthController.php`

6. **Routes** (mise à jour) :
   - `routes/api.php`

### 3. Exécuter la migration

Si vous avez accès à un terminal :

```bash
cd public_html/apibackend
php artisan migrate
```

Sinon, contactez le support pour exécuter la migration.

## 🔧 Configuration

### Variables d'environnement

Aucune configuration supplémentaire n'est nécessaire. Le système utilise les configurations par défaut de Laravel.

## 📱 Utilisation Frontend

### 1. Activer le 2FA

```typescript
// 1. Générer le secret et obtenir le QR code
const response = await api.post('/two-factor/setup');
const { secret, qr_code_url, manual_entry_key } = response.data;

// 2. Afficher le QR code à l'utilisateur
// L'utilisateur scanne avec Google Authenticator

// 3. Vérifier le code et activer
await api.post('/two-factor/enable', {
  secret: secret,
  code: '123456' // Code depuis Google Authenticator
});

// 4. Sauvegarder les codes de récupération
const { recovery_codes } = response.data;
// Afficher ces codes à l'utilisateur pour qu'il les sauvegarde
```

### 2. Connexion avec 2FA

```typescript
// 1. Connexion normale
const loginResponse = await api.post('/login', {
  email: 'user@example.com',
  password: 'password'
});

// 2. Si 2FA est activé
if (loginResponse.data.requires_2fa) {
  const { user_id, temp_token } = loginResponse.data;
  
  // 3. Demander le code 2FA à l'utilisateur
  const code = prompt('Entrez le code depuis Google Authenticator');
  
  // 4. Vérifier le code et finaliser la connexion
  const finalResponse = await api.post('/login/complete-2fa', {
    user_id: user_id,
    code: code
  }, {
    headers: {
      'Authorization': `Bearer ${temp_token}`
    }
  });
  
  // 5. Utiliser le token final
  const { token, user } = finalResponse.data;
}
```

### 3. Désactiver le 2FA

```typescript
await api.post('/two-factor/disable', {
  password: 'user-password' // Confirmation par mot de passe
});
```

### 4. Régénérer les codes de récupération

```typescript
const response = await api.post('/two-factor/regenerate-recovery-codes', {
  password: 'user-password'
});

const { recovery_codes } = response.data;
// Afficher les nouveaux codes à l'utilisateur
```

## 🔐 Sécurité

### Fonctionnalités de sécurité

1. **Codes chiffrés** : Les secrets 2FA sont chiffrés dans la base de données
2. **Codes de récupération** : 8 codes de récupération générés automatiquement
3. **Logs de sécurité** : Toutes les actions 2FA sont loggées
4. **Fenêtre de tolérance** : Vérification avec une fenêtre de 4 périodes (2 minutes)
5. **Vérification du mot de passe** : Requis pour désactiver ou régénérer les codes

### Codes de récupération

Les codes de récupération sont :
- Générés automatiquement lors de l'activation
- Utilisables une seule fois
- Supprimés après utilisation
- Régénérables (nécessite le mot de passe)

## 📝 Endpoints API

### Routes publiques (sans authentification)
- `POST /api/login/complete-2fa` - Finaliser la connexion après 2FA

### Routes protégées (authentification requise)
- `GET /api/two-factor/status` - Obtenir le statut 2FA
- `POST /api/two-factor/setup` - Générer le secret et QR code
- `POST /api/two-factor/enable` - Activer le 2FA
- `POST /api/two-factor/disable` - Désactiver le 2FA
- `POST /api/two-factor/regenerate-recovery-codes` - Régénérer les codes

## 🧪 Test

### Tester l'activation

1. Connectez-vous à l'application
2. Accédez à la section 2FA dans les paramètres
3. Cliquez sur "Activer 2FA"
4. Scannez le QR code avec Google Authenticator
5. Entrez le code de vérification
6. Sauvegardez les codes de récupération

### Tester la connexion

1. Déconnectez-vous
2. Connectez-vous avec email/mot de passe
3. Si 2FA est activé, vous serez invité à entrer le code
4. Entrez le code depuis Google Authenticator
5. La connexion devrait être complétée

## ✅ Checklist

- [ ] Dépendance `pragmarx/google2fa` installée
- [ ] Migration exécutée
- [ ] Fichiers téléversés sur le serveur
- [ ] Routes ajoutées dans `api.php`
- [ ] Test d'activation réussi
- [ ] Test de connexion avec 2FA réussi
- [ ] Codes de récupération sauvegardés

## 🐛 Dépannage

### Erreur : "Class 'PragmaRX\Google2FA\Google2FA' not found"
- Exécutez `composer require pragmarx/google2fa`
- Exécutez `composer dump-autoload`

### Erreur : "Column 'two_factor_enabled' not found"
- Exécutez la migration : `php artisan migrate`

### Code 2FA toujours incorrect
- Vérifiez que l'heure du serveur est synchronisée
- Vérifiez que vous utilisez le bon code (les codes changent toutes les 30 secondes)



