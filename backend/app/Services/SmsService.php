<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de SMS via l'API sms.to (https://sms.to)
 *
 * Documentation : https://docs.sms.to
 * Endpoint      : POST https://api.sms.to/sms/send
 * Auth          : Bearer <API_KEY>
 */
class SmsService
{
    /**
     * Envoyer un SMS simple à un numéro.
     *
     * @param string $to      Numéro au format international (ex : +2250700000000)
     * @param string $message Contenu du message
     */
    public function send(string $to, string $message): bool
    {
        $enabled = (bool) config('services.smsto.enabled', false);
        $apiKey  = (string) config('services.smsto.api_key', '');
        $apiUrl  = (string) config('services.smsto.api_url', 'https://api.sms.to/sms/send');
        $sender  = (string) config('services.smsto.sender_id', 'Bosejour');

        if (!$enabled) {
            return false;
        }

        if ($apiKey === '') {
            Log::warning('SMS.to skipped: missing api_key.');
            return false;
        }

        $to = $this->normalizeNumber($to);
        if ($to === '') {
            Log::warning('SMS.to skipped: invalid phone number.');
            return false;
        }

        $payload = [
            'message'   => $message,
            'to'        => $to,
            'sender_id' => $sender,
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ])->post($apiUrl, $payload);

            if ($response->failed()) {
                Log::error('SMS.to send failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                    'to'     => $to,
                ]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('SMS.to exception: ' . $e->getMessage(), ['to' => $to]);
            return false;
        }
    }

    /**
     * Envoyer un code OTP par SMS.
     */
    public function sendOtp(string $to, string $code): bool
    {
        $message = "Bosejour : votre code de verification est {$code}. Il expire dans 10 minutes. Ne le partagez avec personne.";

        return $this->send($to, $message);
    }

    /**
     * SMS de confirmation de réservation au client.
     */
    public function sendBookingConfirmationToClient($booking): bool
    {
        $phone = $booking->user?->phone;
        if (empty($phone)) {
            return false;
        }

        $place    = $booking->accommodation?->name ?? 'votre hébergement';
        $checkIn  = $booking->check_in ? \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y') : '';
        $checkOut = $booking->check_out ? \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y') : '';
        $code     = $booking->confirmation_code ?? '';

        $message = "Bosejour : reservation confirmee pour {$place} du {$checkIn} au {$checkOut}."
            . ($code !== '' ? " Code : {$code}." : '')
            . " Merci de votre confiance.";

        return $this->send($phone, $message);
    }

    /**
     * SMS de notification de nouvelle réservation à l'hôte.
     */
    public function sendBookingNotificationToHost($booking): bool
    {
        $phone = $booking->accommodation?->host?->phone;
        if (empty($phone)) {
            return false;
        }

        $place    = $booking->accommodation?->name ?? 'votre hébergement';
        $checkIn  = $booking->check_in ? \Carbon\Carbon::parse($booking->check_in)->format('d/m/Y') : '';
        $checkOut = $booking->check_out ? \Carbon\Carbon::parse($booking->check_out)->format('d/m/Y') : '';

        $message = "Bosejour : nouvelle reservation pour {$place} du {$checkIn} au {$checkOut}."
            . " Connectez-vous a votre espace hote pour les details.";

        return $this->send($phone, $message);
    }

    /**
     * Normaliser un numéro ivoirien / international au format E.164.
     */
    private function normalizeNumber(string $number): string
    {
        // Retirer espaces, tirets, parenthèses
        $number = preg_replace('/[\s\-\(\)\.]/', '', trim($number));

        if ($number === '') {
            return '';
        }

        // Déjà au format international
        if (str_starts_with($number, '+')) {
            return $number;
        }

        // 00xxx -> +xxx
        if (str_starts_with($number, '00')) {
            return '+' . substr($number, 2);
        }

        // Numéro local ivoirien (10 chiffres) -> préfixe +225
        $defaultCode = (string) config('services.smsto.default_country_code', '225');
        return '+' . $defaultCode . $number;
    }
}
