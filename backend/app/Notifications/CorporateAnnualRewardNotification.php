<?php

namespace App\Notifications;

use App\Models\CorporateAnnualReward;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notifie l'entreprise de sa progression annuelle et de sa récompense
 * Corporate (doc client §17 : "Les entreprises reçoivent également des
 * notifications concernant leur progression annuelle et leurs récompenses
 * Corporate."), une fois le palier de l'année figé par
 * corporate:compute-annual-rewards.
 */
class CorporateAnnualRewardNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private CorporateAnnualReward $reward) {}

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
        return [
            'type' => 'corporate_annual_reward',
            'year' => $this->reward->year,
            'revenue_total' => (float) $this->reward->revenue_total,
            'reward_label' => $this->reward->reward_label,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://monbeaupays.loyerpay.ci')), '/');

        $mail = (new MailMessage)
            ->subject("bo séjour — Bilan Corporate {$this->reward->year}")
            ->greeting('Bonjour ' . ($notifiable->name ?? '') . ',')
            ->line("Le bilan de votre programme Corporate bo séjour pour l'année {$this->reward->year} est disponible.")
            ->line('Chiffre d\'affaires réalisé : ' . number_format((float) $this->reward->revenue_total, 0, ',', ' ') . ' FCFA.');

        $mail = $this->reward->reward_label
            ? $mail->line("Récompense obtenue : {$this->reward->reward_label}.")
            : $mail->line("Aucun palier de récompense n'a été atteint cette année.");

        return $mail
            ->action('Voir mon espace entreprise', $frontendUrl . '/dashboard/user/entreprise')
            ->salutation("L'équipe bo séjour");
    }
}
