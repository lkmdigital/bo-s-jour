# Configuration Email Rapide - Serveur Mutualisé

## 🚀 Étapes Rapides

### 1. Téléverser les fichiers

Le package `email-files-to-upload` contient tous les fichiers nécessaires. Téléversez via FTP/cPanel :

- `app/Mail/*.php` → `app/Mail/`
- `resources/views/emails/*.blade.php` → `resources/views/emails/`
- `public/test-email.php` → `public/` (pour tester)

### 2. Configurer le fichier .env

Sur le serveur, modifiez `.env` :

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

### 3. Tester

1. Modifiez `public/test-email.php` et changez `$testEmail` avec votre email
2. Accédez à : `https://apimonbeaupays.loyerpay.ci/test-email.php`
3. Vérifiez votre boîte de réception
4. **Supprimez `test-email.php` après les tests**

### 4. Vider le cache (si possible)

Si vous avez accès à un terminal dans cPanel :

```bash
cd public_html/apibackend
php artisan config:clear
php artisan cache:clear
php artisan config:cache
```

## 📧 Types d'Emails Disponibles

1. **BookingConfirmation** - Confirmation de réservation
2. **PaymentConfirmation** - Confirmation de paiement
3. **BookingReminder** - Rappel de paiement
4. **BookingCancelled** - Annulation de réservation
5. **HostNewBooking** - Notification aux hôtes

## 🔧 Configuration SMTP Hostinger

Si votre serveur est chez Hostinger :

1. Créez un compte email dans cPanel (ex: `noreply@bosejour.ci`)
2. Utilisez les credentials de ce compte dans `.env`
3. Serveur SMTP : `smtp.hostinger.com`
4. Port : `587`
5. Encryption : `tls`

## ✅ Vérification

Après configuration, les emails seront automatiquement envoyés pour :
- ✅ Nouvelles réservations
- ✅ Confirmations de paiement
- ✅ Rappels de paiement (via cron job)
- ✅ Annulations de réservation
- ✅ Notifications aux hôtes



