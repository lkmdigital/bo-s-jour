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
        "bo séjour — Réservation confirmée ✅\n"
        . "Établissement : {etablissement}\n"
        . "N° de réservation : {numero}\n"
        . "Code de confirmation (à présenter à l'arrivée) : {code}\n"
        . "Séjour : du {arrivee} au {depart}\n"
        . "Merci et bon séjour ! Votre séjour commence ici.";

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
}
