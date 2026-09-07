<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'recipient_id',
        'sender_id',
        'is_from_platform',
        'subject',
        'body',
        'read_at',
        'parent_id',
        'booking_id',
    ];

    protected function casts(): array
    {
        return [
            'is_from_platform' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'parent_id');
    }

    public function replies(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Message::class, 'parent_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Retour client 2026-09-02 (Partie 4.3) : l'hôte doit être notifié
     * DANS l'Extranet (pas seulement par email/SMS externes) pour chaque
     * nouvelle réservation, modification et annulation. L'Extranet hôte
     * (frontend/app/dashboard/host/inbox) lit ce modèle Message par
     * recipient_id — voir Host/HostInboxController::index(). Centralisé ici
     * en helpers statiques (même pattern que NotificationLog::record) pour
     * être appelé depuis les deux chemins réels de confirmation
     * (BookingService::confirm() ET PaymentController::sendBookingEmails(),
     * qui sont deux implémentations parallèles distinctes) sans dupliquer
     * le texte.
     */
    public static function notifyHostNewBooking(Booking $booking): void
    {
        $hostId = $booking->accommodation?->host_id;
        if (!$hostId) {
            return;
        }
        $accommodationName = $booking->accommodation?->name ?? 'votre établissement';
        $checkIn = $booking->check_in ? $booking->check_in->format('d/m/Y') : '—';
        $checkOut = $booking->check_out ? $booking->check_out->format('d/m/Y') : '—';

        self::create([
            'recipient_id' => $hostId,
            'sender_id' => null,
            'is_from_platform' => true,
            'subject' => 'Nouvelle réservation confirmée',
            'body' => "Une nouvelle réservation vient d'être confirmée pour " . $accommodationName . ".\n\n"
                . "Séjour du " . $checkIn . " au " . $checkOut . " — " . ($booking->guests ?? 1) . " voyageur(s).\n\n"
                . "Réservation #" . $booking->id . ".",
            'booking_id' => $booking->id,
        ]);
    }

    public static function notifyHostBookingModified(Booking $booking, string $summary = ''): void
    {
        $hostId = $booking->accommodation?->host_id;
        if (!$hostId) {
            return;
        }
        $accommodationName = $booking->accommodation?->name ?? 'votre établissement';

        self::create([
            'recipient_id' => $hostId,
            'sender_id' => null,
            'is_from_platform' => true,
            'subject' => 'Réservation modifiée',
            'body' => "La réservation #" . $booking->id . " (" . $accommodationName . ") a été modifiée."
                . ($summary ? "\n\n" . $summary : ''),
            'booking_id' => $booking->id,
        ]);
    }

    public static function notifyHostBookingCancelled(Booking $booking, string $reason = ''): void
    {
        $hostId = $booking->accommodation?->host_id;
        if (!$hostId) {
            return;
        }
        $accommodationName = $booking->accommodation?->name ?? 'votre établissement';

        self::create([
            'recipient_id' => $hostId,
            'sender_id' => null,
            'is_from_platform' => true,
            'subject' => 'Réservation annulée',
            'body' => "La réservation #" . $booking->id . " (" . $accommodationName . ") a été annulée."
                . ($reason ? "\n\nMotif : " . $reason : ''),
            'booking_id' => $booking->id,
        ]);
    }
}
