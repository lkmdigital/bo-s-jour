# Fichiers à Téléverser - Serveur Mutualisé

Guide pour téléverser les fichiers manquants sur un serveur mutualisé via FTP/cPanel.

## 📋 Fichiers Manquants Identifiés

### 1. Fichiers Requests (Validation)
- `app/Http/Requests/SecureLoginRequest.php` ✅ **CRITIQUE**
- `app/Http/Requests/SecureBookingRequest.php` (si utilisé)
- `app/Http/Requests/StoreBookingRequest.php` (si utilisé)
- `app/Http/Requests/StoreRoomRequest.php` (si utilisé)
- `app/Http/Requests/StoreSubscriptionRequest.php` (si utilisé)

### 2. Fichiers Services
- `app/Services/SecurityService.php` ✅ **CRITIQUE**

### 3. Fichiers Middleware (si manquants)
- `app/Http/Middleware/SecurityHeaders.php`
- `app/Http/Middleware/LogSecurityEvents.php`
- `app/Http/Middleware/ValidateFileUpload.php`
- `app/Http/Middleware/ValidateInput.php`

### 4. Fichiers Traits
- `app/Traits/EncryptsSensitiveData.php`

### 5. Fichiers de Configuration
- `config/cors.php` (mise à jour avec bosejour.ci)

## 🚀 Méthode de Téléversement

### Option 1 : Via cPanel File Manager

1. Connectez-vous à cPanel
2. Ouvrez **File Manager**
3. Naviguez vers : `/public_html/apibackend/` (ou le chemin de votre backend)
4. Téléversez les fichiers dans les dossiers correspondants :
   - `app/Http/Requests/SecureLoginRequest.php` → `app/Http/Requests/`
   - `app/Services/SecurityService.php` → `app/Services/`

### Option 2 : Via FTP Client (FileZilla, etc.)

1. Connectez-vous via FTP
2. Naviguez vers le dossier backend
3. Téléversez les fichiers en préservant la structure des dossiers

## 📁 Structure des Dossiers à Créer/Vérifier

Assurez-vous que ces dossiers existent :

```
public_html/apibackend/
├── app/
│   ├── Http/
│   │   └── Requests/
│   │       └── SecureLoginRequest.php  ← À téléverser
│   └── Services/
│       └── SecurityService.php  ← À téléverser
```

## ✅ Checklist de Téléversement

- [ ] `app/Http/Requests/SecureLoginRequest.php` téléversé
- [ ] `app/Services/SecurityService.php` téléversé
- [ ] Dossier `app/Http/Requests/` existe
- [ ] Dossier `app/Services/` existe
- [ ] Permissions correctes (644 pour les fichiers, 755 pour les dossiers)

## 🔧 Après le Téléversement

### Via cPanel Terminal (si disponible)

```bash
cd public_html/apibackend
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

### Via cPanel Cron Jobs (alternative)

Créez un cron job pour exécuter :
```bash
cd /home/u698699576/domains/loyerpay.ci/public_html/apibackend && composer dump-autoload
```

## 📝 Fichiers à Téléverser en Priorité

### Priorité 1 (CRITIQUE - Erreur actuelle)
1. `app/Http/Requests/SecureLoginRequest.php`
2. `app/Services/SecurityService.php`

### Priorité 2 (Recommandé)
3. `app/Http/Middleware/SecurityHeaders.php`
4. `app/Http/Middleware/LogSecurityEvents.php`
5. `app/Traits/EncryptsSensitiveData.php`
6. `config/cors.php` (version mise à jour)

## 🔍 Vérification

Après téléversement, testez la connexion depuis le frontend. Si l'erreur persiste :

1. Vérifiez que les fichiers sont bien téléversés
2. Vérifiez les permissions (644 pour fichiers, 755 pour dossiers)
3. Videz le cache via cPanel ou contactez le support pour exécuter `composer dump-autoload`



