<?php

namespace App\Listeners;

use Illuminate\Mail\Events\MessageSending;

/**
 * Aucun e-mail réel pour les comptes de test de la supervision : tout message dont tous les destinataires
 * sont des adresses synthétiques (@monitor.bosejour.invalid) est annulé avant l'envoi.
 */
class SuppressSyntheticMail
{
    public const DOMAIN = '@monitor.bosejour.invalid';

    public function handle(MessageSending $event): ?bool
    {
        $recipients = array_map(
            fn ($address) => strtolower($address->getAddress()),
            array_merge($event->message->getTo(), $event->message->getCc(), $event->message->getBcc())
        );
        if ($recipients === []) {
            return null;
        }
        foreach ($recipients as $address) {
            if (!str_ends_with($address, self::DOMAIN)) {
                return null; // au moins un vrai destinataire : on laisse partir
            }
        }

        return false; // tous synthétiques : l'envoi est annulé
    }
}
