# Configuration Email - Guide Complet

## 📋 Configuration sur Serveur Mutualisé

### Étape 1 : Modifier le fichier .env

Sur le serveur backend, éditez le fichier `.env` via cPanel File Manager ou FTP :

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

### Étape 2 : Téléverser les fichiers Mailable

Téléversez ces fichiers via FTP/cPanel :

1. **Classes Mailable** :
   - `app/Mail/BookingConfirmation.php`
   - `app/Mail/PaymentConfirmation.php`
   - `app/Mail/BookingReminder.php`
   - `app/Mail/BookingCancelled.php`
   - `app/Mail/HostNewBooking.php`

2. **Vues Email** :
   - `resources/views/emails/booking-confirmation.blade.php`
   - `resources/views/emails/payment-confirmation.blade.php`
   - `resources/views/emails/booking-reminder.blade.php`
   - `resources/views/emails/booking-cancelled.blade.php`
   - `resources/views/emails/host-new-booking.blade.php`

### Étape 3 : Créer les dossiers si nécessaire

Assurez-vous que ces dossiers existent :
- `app/Mail/`
- `resources/views/emails/`

### Étape 4 : Vider le cache (si terminal disponible)

```bash
cd public_html/apibackend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

### Étape 5 : Tester l'envoi

1. Téléversez `public/test-email.php`
2. Accédez à : `https://apimonbeaupays.loyerpay.ci/test-email.php`
3. Vérifiez votre boîte de réception
4. **Supprimez `test-email.php` après les tests**

## 🔧 Options SMTP

### Hostinger (Recommandé)
```env
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
```

### Gmail
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=mot-de-passe-application  # Pas le mot de passe Gmail normal
MAIL_ENCRYPTION=tls
```

### SendGrid
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=votre-api-key-sendgrid
MAIL_ENCRYPTION=tls
```

## 📧 Utilisation dans le Code

### Exemple : Envoyer une confirmation de réservation

```php
use App\Mail\BookingConfirmation;
use Illuminate\Support\Facades\Mail;

// Dans votre contrôleur
Mail::to($booking->user->email)
    ->send(new BookingConfirmation($booking));
```

### Exemple : Envoyer un rappel

```php
use App\Mail\BookingReminder;

$amountDue = $booking->total_price - $booking->amount_paid;
Mail::to($booking->user->email)
    ->send(new BookingReminder($booking, $amountDue));
```

## ✅ Checklist

- [ ] Fichier `.env` modifié avec les credentials SMTP
- [ ] Classes Mailable téléversées
- [ ] Vues email téléversées
- [ ] Dossiers `app/Mail/` et `resources/views/emails/` créés
- [ ] Cache Laravel vidé
- [ ] Test d'envoi réussi
- [ ] Fichier `test-email.php` supprimé

## 🐛 Dépannage

### Erreur : "Connection timeout"
- Vérifiez que le port SMTP est ouvert (587, 465)
- Vérifiez les credentials

### Erreur : "Authentication failed"
- Vérifiez `MAIL_USERNAME` et `MAIL_PASSWORD`
- Pour Gmail, utilisez un mot de passe d'application

### Emails non reçus
- Vérifiez les spams
- Vérifiez les logs : `storage/logs/laravel.log`
- Testez avec `test-email.php`



