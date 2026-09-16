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
        . "Merci de confirmer la disponibilité avant le {echeance} depuis votre espace hôte, sinon la demande sera annulée automatiquement.";

    /**
     * Modèle du message au voyageur une fois l'hôte a confirmé. Espaces
     * réservés : {etablissement}, {arrivee}, {depart}, {lien}.
     */
    public const DEFAULT_APPROVED_PLEASE_PAY_TEMPLATE =
        "BoSéjour — Votre demande est acceptée ✅\n"
        . "Établissement : {etablissement}\n"
        . "Séjour : du {arrivee} au {depart}\n"
        . "Il ne reste plus qu'à payer pour finaliser votre réservation : {lien}";

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
            return true;
        } catch (\Throwable $e) {
            Log::warning('WhatsApp send exception', ['error' => $e->getMessage(), 'to' => $to]);
            return false;
        }
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

        $this->sendText($phone, $msg);
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

        $this->sendText($phone, $msg);
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
        $link = "{$frontend}/bookings/{$booking->id}/payment";

        $template = (string) Setting::get('whatsapp_template_approved_please_pay', self::DEFAULT_APPROVED_PLEASE_PAY_TEMPLATE);
        $msg = strtr($template, [
            '{etablissement}' => $acc,
            '{arrivee}' => $ci,
            '{depart}' => $co,
            '{lien}' => $link,
        ]);

        $this->sendText($phone, $msg);
    }
}
