# Configuration 2FA - Guide Rapide

## 🚀 Étapes Rapides

### 1. Installer la dépendance

Sur le serveur backend :

```bash
cd public_html/apibackend
composer require pragmarx/google2fa
```

### 2. Téléverser les fichiers

Le package `2fa-files-to-upload` contient :
- Migration
- Service TwoFactorService
- Contrôleur TwoFactorController

Téléversez via FTP/cPanel en préservant la structure.

### 3. Mettre à jour les fichiers existants

**app/Models/User.php** :
- Ajouter les champs 2FA dans `$fillable`
- Ajouter les casts pour `two_factor_enabled` et `two_factor_enabled_at`

**app/Http/Controllers/AuthController.php** :
- Ajouter `use App\Services\TwoFactorService;`
- Ajouter la vérification 2FA dans `login()`
- Ajouter la méthode `complete2FALogin()`

**routes/api.php** :
- Ajouter `use App\Http\Controllers\TwoFactorController;`
- Ajouter les routes 2FA

### 4. Exécuter la migration

```bash
php artisan migrate
```

### 5. Vider le cache

```bash
php artisan config:clear
php artisan cache:clear
```

## ✅ Vérification

Testez l'activation 2FA depuis l'application. Le système est maintenant opérationnel !



