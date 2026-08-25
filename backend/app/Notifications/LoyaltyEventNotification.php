<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification générique pour les ~11 déclencheurs du programme de fidélité
 * (gain de points, changement de niveau, bon obtenu, bon proche d'expirer,
 * campagne, anniversaire, parrainage, etc.) — un seul message paramétré par
 * `type` plutôt qu'une classe par déclencheur. Canaux web/app (database) +
 * email — le canal WhatsApp est envoyé séparément par LoyaltyService::notify()
 * via WhatsAppService, qui n'est pas un canal Notification standard dans ce
 * projet (voir SendPostStayReviewLinks pour le même principe).
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
        $channels = ['database'];

        if ($notifiable->notif_email ?? true) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toDatabase(object $notifiable): array
    {
        return array_merge($this->data, [
            'type' => $this->type,
            'message' => $this->message,
        ]);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://monbeaupays.loyerpay.ci')), '/');

        return (new MailMessage)
            ->subject('bo séjour — Programme Membre')
            ->greeting('Bonjour ' . ($notifiable->name ?? '') . ',')
            ->line($this->message)
            ->action('Voir mon programme fidélité', $frontendUrl . '/dashboard/user/programme')
            ->salutation("L'équipe bo séjour");
    }
}
