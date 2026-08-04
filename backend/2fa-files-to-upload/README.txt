===========================================
FICHIERS 2FA À TÉLÉVERSER
===========================================

INSTRUCTIONS:
-------------

1. Connectez-vous à votre cPanel
2. Ouvrez File Manager
3. Naviguez vers: public_html/apibackend/ (ou votre chemin backend)
4. Téléversez les fichiers en préservant la structure des dossiers

STRUCTURE:
----------

database/
└── migrations/
    └── 2025_01_02_000001_add_two_factor_auth_to_users_table.php

app/
├── Services/
│   └── TwoFactorService.php
└── Http/
    └── Controllers/
        └── TwoFactorController.php

IMPORTANT - FICHIERS À METTRE À JOUR:
-------------------------------------

Ces fichiers doivent être mis à jour (pas seulement téléversés) :

1. app/Models/User.php
   - Ajouter les champs 2FA dans $fillable
   - Ajouter les casts pour two_factor_enabled et two_factor_enabled_at

2. app/Http/Controllers/AuthController.php
   - Ajouter la vérification 2FA dans la méthode login()
   - Ajouter la méthode complete2FALogin()

3. routes/api.php
   - Ajouter les routes 2FA
   - Ajouter la route /login/complete-2fa

INSTALLATION:
-------------

1. Installer la dépendance :
   composer require pragmarx/google2fa

2. Exécuter la migration :
   php artisan migrate

3. Vider le cache :
   php artisan config:clear
   php artisan cache:clear

VÉRIFICATION:
-------------

1. Vérifier que la table users a les colonnes :
   - two_factor_enabled
   - two_factor_secret
   - two_factor_recovery_codes
   - two_factor_enabled_at

2. Tester l'activation 2FA depuis l'application
