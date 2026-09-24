<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de messages WhatsApp via l'API Meta Cloud (WhatsApp Business).
 * Les identifiants sont configurés par l'admin (Réglages → Intégrations).
 * Si non configuré, les méthodes sont des no-op (aucune erreur bloquante).
 */
class WhatsAppService
{
    /**
     * Noms des modèles approuvés côté Meta (WhatsApp Manager), langue « fr ». Le détail
     * des textes et de l'ordre des variables est dans modeles-whatsapp-bosejour.md ; toute
     * modification d'un modèle chez Meta doit être répercutée ici (ordre des variables).
     */
    public const TPL_REQUEST_RECEIVED = 'bosejour_demande_recue';
    public const TPL_NEW_REQUEST = 'bosejour_nouvelle_demande';
    public const TPL_APPROVED_PLEASE_PAY = 'bosejour_demande_acceptee';
    public const TPL_CONFIRMATION = 'bosejour_reservation_confirmee';
    public const TPL_VERIFICATION_CODE = 'bosejour_code_verification';
    public const TEMPLATE_LANGUAGE = 'fr';

    /**
     * Modèle par défaut du message de confirmation, éditable dans
     * Paramètres > Modèles. Espaces réservés : {etablissement}, {numero},
     * {code}, {arrivee}, {depart}.
     */
    public const DEFAULT_CONFIRMATION_TEMPLATE =
        "BoSéjour — Réservation confirmée ✅\n"
        . "Établissement : {etablissement}\n"
        . "N° de réservation : {numero}\n"
        . "Code de confirmation (à présenter à l'arrivée) : {code}\n"
        . "Séjour : du {arrivee} au {depart}\n"
        . "Merci et bon séjour ! Votre séjour commence ici.";

    /**
     * Modèle de la notification de nouvelle DEMANDE à l'hôte (retour client
     * 2026-09-16 : confirmation hôte avant paiement). Espaces réservés :
     * {etablissement}, {arrivee}, {depart}, {echeance}.
     */
    public const DEFAULT_NEW_REQUEST_TEMPLATE =
        "BoSéjour — Nouvelle demande de réservation 📩\n"
        . "Établissement : {etablissement}\n"
        . "Séjour demandé : du {arrivee} au {depart}\n"
        . "Merci de confirmer la disponibilité avant le {echeance} depuis votre espace partenaire, sinon la demande sera annulée automatiquement.";

    /**
     * Modèle du message au voyageur une fois l'hôte a confirmé. Espaces
     * réservés : {etablissement}, {arrivee}, {depart}, {lien}.
     */
    public const DEFAULT_APPROVED_PLEASE_PAY_TEMPLATE =
        "BoSéjour — Votre demande est acceptée ✅\n"
        . "Établissement : {etablissement}\n"
        . "Séjour : du {arrivee} au {depart}\n"
        . "Il ne reste plus qu'à payer pour finaliser votre réservation : {lien}";

    /**
     * Message au voyageur dès l'envoi de sa demande de réservation (texte
     * fourni par le client, 2026-09-21).
     */
    public const DEFAULT_REQUEST_RECEIVED_TEMPLATE =
        "Votre demande de réservation a bien été enregistrée !\n\n"
        . "Merci d’avoir choisi *boséjour*.\n\n"
        . "Votre demande a été transmise à l’établissement pour confirmation de disponibilité.\n\n"
        . "Dès validation, vous recevrez votre confirmation de disponibilité ainsi qu’un lien de paiement sécurisé pour finaliser votre réservation.\n\n"
        . "Encore quelques instants… votre séjour prend déjà forme.\n\n"
        . "*boséjour — Votre séjour commence ici...*";

    public function isConfigured(): bool
    {
        return (bool) Setting::get('whatsapp_enabled', false)
            && (string) Setting::get('whatsapp_token', '') !== ''
            && (string) Setting::get('whatsapp_phone_id', '') !== '';
    }

    protected function normalize(?string $phone): ?string
    {
        $p = preg_replace('/[^0-9]/', '', (string) $phone);
        return $p !== '' ? $p : null;
    }

    /**
     * Envoi d'un message texte simple (fenêtre de 24h / tests).
     * En production, Meta exige des templates approuvés pour l'initiation.
     */
    public function sendText(?string $to, string $message): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }
        $to = $this->normalize($to);
        if (!$to) {
            return false;
        }

        $token = (string) Setting::get('whatsapp_token', '');
        $phoneId = (string) Setting::get('whatsapp_phone_id', '');

        try {
            $res = Http::withToken($token)
                ->acceptJson()
                ->post("https://graph.facebook.com/v20.0/{$phoneId}/messages", [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'text',
                    'text' => ['preview_url' => false, 'body' => $message],
                ]);

            if (!$res->successful()) {
                Log::warning('WhatsApp send failed', ['status' => $res->status(), 'body' => $res->body(), 'to' => $to]);
                return false;
            }
            // Meta répond 200 dès qu'il accepte le message ; la livraison réelle (fenêtre de 24 h
            // dépassée, numéro injoignable…) est confirmée plus tard par webhook, que le site
            // n'écoute pas. On garde l'identifiant pour pouvoir le retrouver côté Meta.
            Log::info('WhatsApp message accepté par Meta', ['type' => 'text', 'to' => $to, 'wamid' => $res->json('messages.0.id')]);
            return true;
        } catch (\Throwable $e) {
            Log::warning('WhatsApp send exception', ['error' => $e->getMessage(), 'to' => $to]);
            return false;
        }
    }


    /** Faut-il passer par les modèles approuvés (production) plutôt que le texte libre (tests, fenêtre 24 h) ? */
    public function usesTemplates(): bool
    {
        return (bool) Setting::get('whatsapp_use_templates', false);
    }

    /**
     * Envoi d'un modèle approuvé par Meta — seul moyen d'écrire en premier à un client hors
     * de la fenêtre de 24 h. $bodyParams remplit {{1}}, {{2}}… du corps dans l'ordre ;
     * $urlButtonParam remplit la variable d'un bouton URL dynamique (index 0).
     */
    public function sendTemplate(?string $to, string $template, array $bodyParams = [], ?string $urlButtonParam = null): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }
        $to = $this->normalize($to);
        if (!$to) {
            return false;
        }

        $token = (string) Setting::get('whatsapp_token', '');
        $phoneId = (string) Setting::get('whatsapp_phone_id', '');

        $components = [];
        if ($bodyParams !== []) {
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => $this->cleanParam($v)], array_values($bodyParams)),
            ];
        }
        if ($urlButtonParam !== null) {
            $components[] = [
                'type' => 'button',
                'sub_type' => 'url',
                'index' => '0',
                'parameters' => [['type' => 'text', 'text' => $urlButtonParam]],
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => $template,
                'language' => ['code' => self::TEMPLATE_LANGUAGE],
            ],
        ];
        if ($components !== []) {
            $payload['template']['components'] = $components;
        }

        try {
            $res = Http::withToken($token)
                ->acceptJson()
                ->post("https://graph.facebook.com/v20.0/{$phoneId}/messages", $payload);

            if (!$res->successful()) {
                Log::warning('WhatsApp template send failed', ['template' => $template, 'status' => $res->status(), 'body' => $res->body(), 'to' => $to]);
                return false;
            }
            Log::info('WhatsApp message accepté par Meta', ['type' => 'template', 'template' => $template, 'to' => $to, 'wamid' => $res->json('messages.0.id')]);
            return true;
        } catch (\Throwable $e) {
            Log::warning('WhatsApp template send exception', ['template' => $template, 'error' => $e->getMessage(), 'to' => $to]);
            return false;
        }
    }

    /**
     * Envoie via le modèle approuvé quand le mode « modèles » est activé, avec repli sur le
     * texte libre si Meta refuse le modèle (pas encore approuvé, variable invalide…) : le
     * repli ne marche que dans la fenêtre de 24 h, mais évite de perdre le message en test.
     */
    protected function deliver(?string $to, string $template, array $bodyParams, string $fallbackText, ?string $urlButtonParam = null): bool
    {
        if ($this->usesTemplates() && $this->sendTemplate($to, $template, $bodyParams, $urlButtonParam)) {
            return true;
        }
        return $this->sendText($to, $fallbackText);
    }

    /** Meta refuse les retours à la ligne, tabulations et suites de 4 espaces dans une variable. */
    private function cleanParam(mixed $value): string
    {
        $v = trim(preg_replace('/\s+/', ' ', (string) $value));
        return $v !== '' ? $v : '—';
    }

    /** Confirmation de réservation au voyageur (double canal avec l'e-mail). */
    public function sendBookingConfirmation(Booking $booking): void
    {
        $phone = $booking->traveler_phone ?: ($booking->user->phone ?? null);
        if (!$phone) {
            return;
        }
        $code = $booking->confirmation_code ?: ('#' . $booking->id);
        $number = $booking->booking_number ?: $code;
        $acc = optional($booking->accommodation)->name ?? 'votre établissement';
        $ci = \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y');
        $co = \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y');

        $template = (string) Setting::get('whatsapp_template_confirmation', self::DEFAULT_CONFIRMATION_TEMPLATE);
        $msg = strtr($template, [
            '{etablissement}' => $acc,
            '{numero}' => $number,
            '{code}' => $code,
            '{arrivee}' => $ci,
            '{depart}' => $co,
        ]);

        $this->deliver($phone, self::TPL_CONFIRMATION, [$acc, $number, $code, $ci, $co], $msg);
    }

    /** Nouvelle demande de réservation à confirmer, envoyée à l'hôte. */
    public function sendNewRequestNotification(Booking $booking): void
    {
        $phone = optional($booking->accommodation?->host)->phone;
        if (!$phone) {
            return;
        }
        $acc = optional($booking->accommodation)->name ?? 'votre établissement';
        $ci = \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y');
        $co = \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y');
        $deadline = $booking->expires_at ? \Carbon\Carbon::parse($booking->expires_at)->format('d/m/Y à H:i') : '—';

        $template = (string) Setting::get('whatsapp_template_new_request', self::DEFAULT_NEW_REQUEST_TEMPLATE);
        $msg = strtr($template, [
            '{etablissement}' => $acc,
            '{arrivee}' => $ci,
            '{depart}' => $co,
            '{echeance}' => $deadline,
        ]);

        $this->deliver($phone, self::TPL_NEW_REQUEST, [$acc, $ci, $co, $deadline], $msg);
    }

    /** Accusé de réception de la demande, envoyé au voyageur. */
    public function sendRequestReceived(Booking $booking): void
    {
        $phone = $booking->user->phone ?? null;
        if (!$phone) {
            return;
        }

        $msg = (string) Setting::get('whatsapp_template_request_received', self::DEFAULT_REQUEST_RECEIVED_TEMPLATE);

        $this->deliver($phone, self::TPL_REQUEST_RECEIVED, [], $msg);
    }

    /** L'hôte a confirmé la disponibilité — invitation à payer, au voyageur. */
    public function sendApprovedPleasePay(Booking $booking): void
    {
        $phone = $booking->traveler_phone ?: ($booking->user->phone ?? null);
        if (!$phone) {
            return;
        }
        $acc = optional($booking->accommodation)->name ?? 'votre établissement';
        $ci = \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y');
        $co = \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y');
        $frontend = rtrim(config('services.frontend_url', 'https://bosejour.ci'), '/');
        $link = "{$frontend}/bookings/{$booking->access_token}/payment";

        $template = (string) Setting::get('whatsapp_template_approved_please_pay', self::DEFAULT_APPROVED_PLEASE_PAY_TEMPLATE);
        $msg = strtr($template, [
            '{etablissement}' => $acc,
            '{arrivee}' => $ci,
            '{depart}' => $co,
            '{lien}' => $link,
        ]);

        // Modèle : le bouton « Payer » pointe vers /paiement/{jeton} (redirection côté site).
        $this->deliver($phone, self::TPL_APPROVED_PLEASE_PAY, [$acc, $ci, $co], $msg, (string) $booking->access_token);
    }

    /** Code de vérification du numéro (modèle « Authentication » : le code sert aussi de variable du bouton « Copier »). */
    public function sendVerificationCode(?string $to, string $code): bool
    {
        $text = "BoSéjour — Votre code de vérification : {$code}\nCe code expire dans 10 minutes.";

        if ($this->usesTemplates() && $this->sendTemplate($to, self::TPL_VERIFICATION_CODE, [$code], $code)) {
            return true;
        }
        return $this->sendText($to, $text);
    }
}
