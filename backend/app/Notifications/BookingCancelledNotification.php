<?php

namespace App\Notifications;

use App\Mail\BookingCancelled;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BookingCancelledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private Booking $booking,
        private string $reason = ''
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): BookingCancelled
    {
        return new BookingCancelled($this->booking, $this->reason ?: 'Non spécifiée');
    }

    public function toDatabase(object $notifiable): array
    {
        // Retour client 2026-09-16 : le refus hôte et l'expiration du délai de
        // réponse (parcours "confirmation hôte avant paiement") annulent
        // désormais couramment une réservation AVANT tout paiement, donc
        // AVANT que confirmation_code n'existe (généré uniquement à
        // Confirmed) — sans ce repli, le message affichait "Réservation #
        // annulée." (code vide).
        $reference = $this->booking->confirmation_code
            ?: $this->booking->booking_number
            ?: (string) $this->booking->id;

        return [
            'type'       => 'booking_cancelled',
            'booking_id' => $this->booking->id,
            'message'    => "Réservation #{$reference} annulée.",
            'reason'     => $this->reason,
        ];
    }
}
