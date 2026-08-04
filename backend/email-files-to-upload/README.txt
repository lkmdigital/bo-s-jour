===========================================
FICHIERS EMAIL À TÉLÉVERSER
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
└── Mail/
    ├── BookingConfirmation.php
    ├── PaymentConfirmation.php
    ├── BookingReminder.php
    ├── BookingCancelled.php
    └── HostNewBooking.php

resources/
└── views/
    └── emails/
        ├── booking-confirmation.blade.php
        ├── payment-confirmation.blade.php
        ├── booking-reminder.blade.php
        ├── booking-cancelled.blade.php
        └── host-new-booking.blade.php

public/
└── test-email.php  (pour tester, supprimez après)

CONFIGURATION .env:
-------------------

Ajoutez/modifiez dans .env:

MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@votre-domaine.com
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@bosejour.ci"
MAIL_FROM_NAME="Bosejour"

TEST:
-----

1. Téléversez public/test-email.php
2. Accédez à: https://apimonbeaupays.loyerpay.ci/test-email.php
3. Modifiez l'email de test dans le fichier
4. Vérifiez votre boîte de réception
5. SUPPRIMEZ test-email.php après les tests

APRÈS TÉLÉVERSEMENT:
--------------------

Si vous avez accès à un terminal dans cPanel:
  php artisan config:clear
  php artisan cache:clear
  php artisan config:cache

Sinon, contactez le support pour exécuter ces commandes.
