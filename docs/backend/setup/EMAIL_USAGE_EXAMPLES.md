# Exemples d'Utilisation des Emails

## 📧 Utilisation des Classes Mailable

### 1. Envoyer une confirmation de réservation

```php
use App\Mail\BookingConfirmation;
use Illuminate\Support\Facades\Mail;

// Dans BookingController après création d'une réservation
$booking = Booking::create([...]);

// Envoyer l'email de confirmation
try {
    Mail::to($booking->user->email)
        ->send(new BookingConfirmation($booking));
} catch (\Exception $e) {
    \Log::error('Failed to send booking confirmation email', [
        'booking_id' => $booking->id,
        'error' => $e->getMessage(),
    ]);
}
```

### 2. Envoyer une confirmation de paiement

```php
use App\Mail\PaymentConfirmation;
use Illuminate\Support\Facades\Mail;

// Dans PaymentController après paiement réussi
$payment = Payment::create([...]);

// Envoyer l'email de confirmation
try {
    Mail::to($payment->booking->user->email)
        ->send(new PaymentConfirmation($payment));
} catch (\Exception $e) {
    \Log::error('Failed to send payment confirmation email', [
        'payment_id' => $payment->id,
        'error' => $e->getMessage(),
    ]);
}
```

### 3. Envoyer un rappel de paiement

```php
use App\Mail\BookingReminder;
use Illuminate\Support\Facades\Mail;

// Dans RemindAndCancelUnpaidBookings command
$amountDue = $booking->total_price - $booking->amount_paid;

try {
    Mail::to($booking->user->email)
        ->send(new BookingReminder($booking, $amountDue));
} catch (\Exception $e) {
    \Log::error('Failed to send reminder email', [
        'booking_id' => $booking->id,
        'error' => $e->getMessage(),
    ]);
}
```

### 4. Envoyer une notification d'annulation

```php
use App\Mail\BookingCancelled;
use Illuminate\Support\Facades\Mail;

// Lors de l'annulation d'une réservation
$reason = 'Paiement non reçu avant la date d\'arrivée';

try {
    Mail::to($booking->user->email)
        ->send(new BookingCancelled($booking, $reason));
} catch (\Exception $e) {
    \Log::error('Failed to send cancellation email', [
        'booking_id' => $booking->id,
        'error' => $e->getMessage(),
    ]);
}
```

### 5. Notifier un hôte d'une nouvelle réservation

```php
use App\Mail\HostNewBooking;
use Illuminate\Support\Facades\Mail;

// Dans BookingController après création d'une réservation
$host = $accommodation->host;

try {
    Mail::to($host->email)
        ->send(new HostNewBooking($booking));
} catch (\Exception $e) {
    \Log::error('Failed to send host notification email', [
        'booking_id' => $booking->id,
        'host_id' => $host->id,
        'error' => $e->getMessage(),
    ]);
}
```

## 🔄 Migration depuis Mail::raw()

Si vous voulez remplacer les `Mail::raw()` existants par les classes Mailable :

### Avant (Mail::raw)
```php
Mail::raw($body, function ($message) use ($booking, $subject) {
    $message->to($booking->user->email)
        ->subject($subject);
});
```

### Après (Mailable)
```php
Mail::to($booking->user->email)
    ->send(new BookingReminder($booking, $amountDue));
```

## 📝 Notes

- Les emails utilisent les templates Blade dans `resources/views/emails/`
- Les templates sont responsives et utilisent les polices correctes (DM Sans + Brush Script MT pour slogans)
- Tous les emails incluent le logo et le slogan de Bosejour
- Les erreurs sont loggées dans `storage/logs/laravel.log`



