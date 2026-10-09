<?php

namespace App\Console\Commands;

use App\Models\Setting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Inscrit le numéro WhatsApp Business auprès de l'API Cloud de Meta.
 *
 * Tant que ce n'est pas fait, le numéro reste « En attente » dans le Gestionnaire WhatsApp et
 * aucun message ne part. Meta n'offre pas de bouton pour cela : l'inscription passe par l'API
 * (POST /{phone-number-id}/register). Le jeton et l'ID du numéro sont lus dans les réglages de
 * la plateforme (admin > WhatsApp), donc rien de secret ne transite par la ligne de commande.
 *
 * Le code PIN à 6 chiffres est choisi ici ; il devient le code de vérification en deux étapes
 * du numéro et sert à toute réinscription ultérieure : à conserver.
 */
class WhatsAppRegisterNumber extends Command
{
    protected $signature = 'whatsapp:register-number';

    protected $description = "Inscrit le numéro WhatsApp Business auprès de l'API Cloud de Meta (statut « En attente » → « Connecté »).";

    public function handle(): int
    {
        $token = (string) Setting::get('whatsapp_token', '');
        $phoneId = (string) Setting::get('whatsapp_phone_id', '');
        if ($token === '' || $phoneId === '') {
            $this->error("Le jeton et l'ID du numéro doivent d'abord être renseignés dans l'admin (WhatsApp).");

            return self::FAILURE;
        }

        $this->line("Numéro à inscrire (ID) : {$phoneId}");
        $pin = (string) $this->secret('Choisissez un code PIN à 6 chiffres (à conserver)');
        if (! preg_match('/^\d{6}$/', $pin)) {
            $this->error('Le code PIN doit comporter exactement 6 chiffres.');

            return self::FAILURE;
        }
        if (! $this->confirm('Inscrire ce numéro auprès de Meta maintenant ?', false)) {
            $this->warn('Annulé, rien n\'a été envoyé.');

            return self::FAILURE;
        }

        $res = Http::withToken($token)->acceptJson()->post("https://graph.facebook.com/v20.0/{$phoneId}/register", [
            'messaging_product' => 'whatsapp',
            'pin' => $pin,
        ]);

        if ($res->successful() && $res->json('success')) {
            $this->info('Numéro inscrit. Le statut passera à « Connecté » dans le Gestionnaire WhatsApp sous quelques minutes.');

            return self::SUCCESS;
        }

        $this->error('Meta a refusé : ' . ($res->json('error.message') ?? $res->body()));
        $code = $res->json('error.code');
        if ($code === 190) {
            $this->line('→ Le jeton est invalide ou expiré : régénérez-le.');
        } elseif (in_array($code, [10, 200], true)) {
            $this->line("→ Le jeton n'a pas accès à ce compte WhatsApp : affectez « BoSéjour » à l'utilisateur système.");
        }

        return self::FAILURE;
    }
}
