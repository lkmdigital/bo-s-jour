<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Vérification rapide du numéro WhatsApp saisi lors de la réservation
 * (brief Parcours Voyageur, Étape 8 — "Confirmation du numéro WhatsApp").
 * Codes stockés en cache (éphémère, pas de table dédiée) car ils ne
 * concernent pas forcément un compte utilisateur (réservation invité).
 */
class BookingWhatsappOtpController extends Controller
{
    private function normalize(string $phone): string
    {
        return preg_replace('/[^0-9]/', '', $phone) ?: '';
    }

    private function codeKey(string $phone): string
    {
        return 'booking_wa_otp:' . $phone;
    }

    private function verifiedKey(string $phone): string
    {
        return 'booking_wa_otp_verified:' . $phone;
    }

    /**
     * Indique si la vérification est disponible (intégration WhatsApp configurée par l'admin).
     * Si non configurée, le frontend doit sauter l'étape plutôt que de simuler une vérification.
     */
    public function status()
    {
        return response()->json([
            'available' => app(WhatsAppService::class)->isConfigured(),
        ]);
    }

    public function send(Request $request)
    {
        $data = $request->validate(['phone' => 'required|string|max:20']);
        $wa = app(WhatsAppService::class);

        if (!$wa->isConfigured()) {
            return response()->json(['message' => "Vérification WhatsApp indisponible pour le moment.", 'available' => false], 422);
        }

        $phone = $this->normalize($data['phone']);
        if ($phone === '') {
            return response()->json(['message' => 'Numéro invalide.'], 422);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        Cache::put($this->codeKey($phone), $code, now()->addMinutes(10));
        Cache::forget($this->verifiedKey($phone));

        $sent = $wa->sendText($phone, "bo séjour — Votre code de vérification : {$code}\nCe code expire dans 10 minutes.");

        if (!$sent) {
            return response()->json(['message' => "Échec de l'envoi du code par WhatsApp. Réessayez."], 503);
        }

        return response()->json(['message' => 'Code envoyé par WhatsApp.']);
    }

    public function verify(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required|string|max:20',
            'code' => 'required|string|size:6',
        ]);

        $phone = $this->normalize($data['phone']);
        $expected = Cache::get($this->codeKey($phone));

        if (!$expected || !hash_equals((string) $expected, $data['code'])) {
            return response()->json(['message' => 'Code incorrect ou expiré.', 'verified' => false], 422);
        }

        Cache::forget($this->codeKey($phone));
        Cache::put($this->verifiedKey($phone), true, now()->addMinutes(30));

        return response()->json(['message' => 'Numéro vérifié.', 'verified' => true]);
    }
}
