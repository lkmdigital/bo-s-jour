<?php

namespace App\Notifications\Channels;

use App\Notifications\Messages\OneSignalEmailMessage;
use App\Services\OneSignalService;
use Illuminate\Notifications\Notification;

class OneSignalEmailChannel
{
    public function __construct(private OneSignalService $oneSignalService) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (!method_exists($notification, 'toOneSignalEmail')) {
            return;
        }

        $message = $notification->toOneSignalEmail($notifiable);

        if (!$message instanceof OneSignalEmailMessage) {
            return;
        }

        $email = null;

        if (method_exists($notifiable, 'routeNotificationFor')) {
            $email = $notifiable->routeNotificationFor('mail', $notification);
        }

        $email = $email ?: ($notifiable->email ?? null);

        if (empty($email)) {
            return;
        }

        $this->oneSignalService->sendEmail(
            email: (string) $email,
            subject: $message->subject,
            body: $message->body,
            url: $message->url,
            data: [
                'notification' => class_basename($notification),
                'user_id' => $notifiable->id ?? null,
            ]
        );
    }
}
