<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Trace des notifications réellement envoyées (ou tentées) pour une
 * réservation — retour client 2026-09-02 (Partie 4.3, "événements de
 * notification"). Volontairement minimal : enregistre la tentative
 * (canal, destinataire, succès/échec), pas le contenu du message.
 */
class NotificationLog extends Model
{
    protected $fillable = [
        'booking_id',
        'event',
        'channel',
        'recipient_type',
        'recipient',
        'success',
        'error',
    ];

    protected function casts(): array
    {
        return [
            'success' => 'boolean',
        ];
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Enregistre une tentative d'envoi — n'importe jamais l'exception à
     * l'appelant (une panne du journal ne doit jamais empêcher l'envoi réel).
     */
    public static function record(
        int $bookingId,
        string $event,
        string $channel,
        string $recipientType,
        ?string $recipient,
        bool $success,
        ?string $error = null
    ): void {
        try {
            self::create([
                'booking_id' => $bookingId,
                'event' => $event,
                'channel' => $channel,
                'recipient_type' => $recipientType,
                'recipient' => $recipient,
                'success' => $success,
                'error' => $error ? mb_substr($error, 0, 500) : null,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('NotificationLog::record failed', [
                'booking_id' => $bookingId,
                'event' => $event,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
