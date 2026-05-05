# Configuration du Système d'Email - VPS/Serveur Mutualisé

Guide complet pour configurer l'envoi d'emails avec Laravel sur votre serveur.

## 📋 Prérequis

- Serveur backend Laravel configuré
- Accès au fichier `.env` sur le serveur
- Compte email SMTP (Hostinger, Gmail, Mailgun, etc.)

## 🔧 Configuration SMTP

### Option 1 : SMTP Hostinger (Recommandé pour serveur Hostinger)

Si votre serveur est chez Hostinger, utilisez leur SMTP :

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@votre-domaine.com
MAIL_PASSWORD=votre-mot-de-passe-email
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@bosejour.ci"
MAIL_FROM_NAME="Bosejour"
```

### Option 2 : Gmail SMTP

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-mot-de-passe-app  # Mot de passe d'application, pas le mot de passe Gmail
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@bosejour.ci"
MAIL_FROM_NAME="Bosejour"
```

**Note Gmail** : Vous devez créer un "Mot de passe d'application" dans les paramètres de sécurité de votre compte Google.

### Option 3 : Mailgun (Service professionnel)

```env
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=votre-domaine.mailgun.org
MAILGUN_SECRET=votre-cle-secrete-mailgun
MAILGUN_ENDPOINT=api.mailgun.net
MAIL_FROM_ADDRESS="noreply@bosejour.ci"
MAIL_FROM_NAME="Bosejour"
```

### Option 4 : SendGrid

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=votre-api-key-sendgrid
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@bosejour.ci"
MAIL_FROM_NAME="Bosejour"
```

## 📝 Configuration sur le Serveur

### Étape 1 : Modifier le fichier .env

Sur le serveur backend, éditez le fichier `.env` :

```bash
# Via cPanel File Manager ou FTP
# Naviguez vers: public_html/apibackend/.env
```

Ajoutez/modifiez les variables :

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@votre-domaine.com
MAIL_PASSWORD=votre-mot-de-passe
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@bosejour.ci"
MAIL_FROM_NAME="Bosejour"
```

### Étape 2 : Vider le cache Laravel

Si vous avez accès à un terminal dans cPanel :

```bash
cd public_html/apibackend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

Sinon, contactez le support pour exécuter ces commandes.

## 🧪 Test de l'Envoi d'Email

### Créer un script de test

Créez un fichier `test-email.php` dans le dossier `public` :

```php
<?php
require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Mail;

try {
    Mail::raw('Test d\'envoi d\'email depuis Bosejour', function ($message) {
        $message->to('votre-email@test.com')
                ->subject('Test Email - Bosejour');
    });
    
    echo "✅ Email envoyé avec succès !";
} catch (\Exception $e) {
    echo "❌ Erreur : " . $e->getMessage();
}
```

Accédez à : `https://apimonbeaupays.loyerpay.ci/test-email.php`

### OU via Artisan Tinker (si terminal disponible)

```bash
php artisan tinker
>>> Mail::raw('Test email', function($m) { $m->to('votre-email@test.com')->subject('Test'); });
```

## 📧 Types d'Emails à Envoyer

L'application envoie des emails pour :

1. **Rappels de paiement** : Réservations non payées
2. **Annulations** : Réservations annulées faute de paiement
3. **Confirmations de réservation** : Après création d'une réservation
4. **Confirmations de paiement** : Après paiement réussi
5. **Notifications aux hôtes** : Nouvelles réservations

## 🔒 Sécurité

- Ne jamais commiter le fichier `.env` avec les mots de passe
- Utiliser des mots de passe d'application pour Gmail
- Vérifier que le port SMTP n'est pas bloqué par le firewall
- Utiliser TLS/SSL pour le chiffrement

## 🐛 Dépannage

### Erreur : "Connection timeout"

- Vérifiez que le port SMTP est ouvert (587, 465, 25)
- Vérifiez les credentials (username/password)
- Vérifiez que le serveur SMTP est accessible depuis votre VPS

### Erreur : "Authentication failed"

- Vérifiez `MAIL_USERNAME` et `MAIL_PASSWORD`
- Pour Gmail, utilisez un mot de passe d'application
- Vérifiez que l'email expéditeur existe

### Erreur : "Could not instantiate mailer"

- Vérifiez que les extensions PHP nécessaires sont installées
- Vérifiez la configuration dans `.env`
- Videz le cache : `php artisan config:clear`

## 📚 Ressources

- [Documentation Laravel Mail](https://laravel.com/docs/mail)
- [Configuration SMTP Hostinger](https://www.hostinger.com/tutorials/how-to-use-free-email-smtp-server)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)



