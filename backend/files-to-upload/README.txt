===========================================
FICHIERS À TÉLÉVERSER - SERVEUR MUTUALISÉ
===========================================

INSTRUCTIONS:
-------------

1. Connectez-vous à votre cPanel
2. Ouvrez File Manager
3. Naviguez vers: public_html/apibackend/ (ou votre chemin backend)
4. Téléversez les fichiers en préservant la structure des dossiers

STRUCTURE:
----------

app/
├── Http/
│   └── Requests/
│       └── SecureLoginRequest.php  ← CRITIQUE
└── Services/
    └── SecurityService.php  ← CRITIQUE

config/
└── cors.php  ← Mise à jour avec bosejour.ci

PRIORITÉ:
---------

1. CRITIQUE (à téléverser en premier):
   - app/Http/Requests/SecureLoginRequest.php
   - app/Services/SecurityService.php

2. RECOMMANDÉ:
   - Tous les autres fichiers dans ce package

APRÈS TÉLÉVERSEMENT:
--------------------

Si vous avez accès à un terminal dans cPanel, exécutez:
  composer dump-autoload
  php artisan config:clear
  php artisan cache:clear

Sinon, contactez le support pour exécuter ces commandes.

VÉRIFICATION:
------------

Testez la connexion depuis le frontend. L'erreur 500 devrait être résolue.
