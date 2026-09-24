<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Webhook WhatsApp Business (Meta). Meta y notifie le sort réel de chaque message envoyé
 * (sent / delivered / read / failed) : sans lui, un message « accepté » par l'API mais jamais
 * livré (fenêtre de 24 h fermée, numéro injoignable…) reste invisible.
 *
 * Configuration côté Meta (App → WhatsApp → Configuration → Webhook) :
 *   URL de rappel : https://api.bosejour.ci/api/whatsapp/webhook
 *   Jeton de vérification : la valeur de « whatsapp_verify_token » (Réglages avancés)
 *   Champ à cocher : « messages »
 * Le « secret de l'application » (Paramètres de l'app → Général) sert à signer chaque appel.
 */
class WhatsAppWebhookController extends Controller
{
    /** Poignée de main initiale : Meta vérifie qu'on connaît le jeton et attend le « challenge » en clair. */
    public function verify(Request $request)
    {
        $expected = (string) Setting::get('whatsapp_verify_token', '');

        if ($expected !== ''
            && $request->query('hub_mode') === 'subscribe'
            && hash_equals($expected, (string) $request->query('hub_verify_token'))) {
            return response((string) $request->query('hub_challenge'), 200)->header('Content-Type', 'text/plain');
        }

        Log::warning('Webhook WhatsApp : vérification refusée (jeton invalide ou non configuré)', ['ip' => $request->ip()]);
        return response('Forbidden', 403);
    }

    /** Réception des événements. Toujours signé (X-Hub-Signature-256), sans secret configuré on refuse. */
    public function receive(Request $request)
    {
        if (!$this->signatureIsValid($request)) {
            Log::warning('Webhook WhatsApp : signature invalide ou secret non configuré', ['ip' => $request->ip()]);
            return response()->json(['error' => 'Signature invalide'], 403);
        }

        foreach ((array) $request->input('entry', []) as $entry) {
            foreach ((array) ($entry['changes'] ?? []) as $change) {
                $value = $change['value'] ?? [];

                foreach ((array) ($value['statuses'] ?? []) as $status) {
                    $this->logStatus($status);
                }
                // Messages entrants : ils ouvrent la fenêtre de 24 h côté Meta, rien à faire ici.
            }
        }

        // Meta relance tout appel qui ne répond pas 200 : on acquitte toujours une fois la signature validée.
        return response()->json(['status' => 'ok']);
    }

    private function signatureIsValid(Request $request): bool
    {
        $secret = (string) Setting::get('whatsapp_app_secret', '');
        $header = (string) $request->header('X-Hub-Signature-256', '');

        if ($secret === '' || !str_starts_with($header, 'sha256=')) {
            return false;
        }

        $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);
        return hash_equals($expected, $header);
    }

    private function logStatus(array $status): void
    {
        $context = [
            'wamid' => $status['id'] ?? null,
            'to' => $status['recipient_id'] ?? null,
            'status' => $status['status'] ?? null,
        ];

        if (($status['status'] ?? null) === 'failed') {
            $error = $status['errors'][0] ?? [];
            Log::warning('WhatsApp message NON livré', $context + [
                'code' => $error['code'] ?? null,
                'title' => $error['title'] ?? null,
                'details' => $error['error_data']['details'] ?? ($error['message'] ?? null),
            ]);
            return;
        }

        Log::info('WhatsApp statut du message', $context);
    }
}
