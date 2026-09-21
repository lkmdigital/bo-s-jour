<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notification in-app (cloche) du voyageur sur l'avancement de sa demande de
 * réservation : demande enregistrée, demande acceptée par le partenaire.
 * Synchrone (pas de file d'attente) pour apparaître immédiatement dans la
 * cloche ; les e-mails/SMS/WhatsApp correspondants sont envoyés à part.
 * Retour client 2026-09-21 : "les notifications ne s'affichent pas".
 */
class TravelerBookingUpdateNotification extends Notification
{
    use Queueable;

    public function __construct(private Booking $booking, private string $type)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $place = $this->booking->accommodation?->name ?? "l'établissement";
        $ref = $this->booking->booking_number ?: '#' . $this->booking->id;

        $message = match ($this->type) {
            'booking_request_received' => "Votre demande de réservation {$ref} a bien été enregistrée. Elle a été transmise à {$place} pour confirmation de disponibilité.",
            'booking_approved' => "{$place} a confirmé la disponibilité pour vos dates. Finalisez votre réservation en payant en ligne.",
            default => "Mise à jour de votre réservation {$ref}.",
        };

        return [
            'type'       => $this->type,
            'booking_id' => $this->booking->id,
            'message'    => $message,
        ];
    }
}
