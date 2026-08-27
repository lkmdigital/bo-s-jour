<?php

namespace App\Notifications;

use App\Models\Promotion;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Alerte "nouvelle promotion" (doc client "MODULE IA BOSÉJOUR" §3.12) pour
 * les voyageurs ayant mis un établissement en favori. Déclenchée depuis
 * PromotionController::store() — voir
 * PromotionController::notifyFavoritesOfNewPromotion().
 */
class NewPromotionForFavoriteNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Promotion $promotion) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->notif_email ?? true) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    private function discountLabel(): string
    {
        return match ($this->promotion->discount_type) {
            'fixed' => number_format((float) $this->promotion->discount_amount, 0, ',', ' ') . ' FCFA de réduction',
            'free_night' => 'une nuit offerte',
            default => "{$this->promotion->discount_percent}% de réduction",
        };
    }

    public function toDatabase(object $notifiable): array
    {
        $name = $this->promotion->accommodation->name ?? 'un établissement';

        return [
            'type' => 'new_promotion_favorite',
            'accommodation_id' => $this->promotion->accommodation_id,
            'accommodation_name' => $name,
            'message' => "Nouvelle promotion chez {$name} : {$this->discountLabel()}.",
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $name = $this->promotion->accommodation->name ?? 'un établissement';
        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://bosejour.ci')), '/');

        $mail = (new MailMessage)
            ->subject("bo séjour — Nouvelle promotion chez {$name}")
            ->greeting('Bonjour ' . ($notifiable->name ?? '') . ',')
            ->line("Un établissement que vous suivez, {$name}, propose une nouvelle promotion : {$this->discountLabel()}.");

        if ($this->promotion->promo_code) {
            $mail->line("Code promo : {$this->promotion->promo_code}");
        }

        return $mail
            ->action('Voir l\'établissement', $frontendUrl . '/accommodations/' . $this->promotion->accommodation_id)
            ->salutation("L'équipe bo séjour");
    }
}
