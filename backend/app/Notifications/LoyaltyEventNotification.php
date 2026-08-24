<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Notification générique pour les ~11 déclencheurs du programme de fidélité
 * (gain de points, changement de niveau, bon obtenu, bon proche d'expirer,
 * campagne, anniversaire, parrainage, etc.) — un seul message paramétré par
 * `type` plutôt qu'une classe par déclencheur.
 */
class LoyaltyEventNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private string $type,
        private string $message,
        private array $data = []
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return array_merge($this->data, [
            'type' => $this->type,
            'message' => $this->message,
        ]);
    }
}
