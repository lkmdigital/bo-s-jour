<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    private string $appId;
    private string $apiKey;

    public function __construct()
    {
        $this->appId  = config('services.onesignal.app_id', '');
        $this->apiKey = config('services.onesignal.api_key', '');
    }

    /**
     * Déclenché par le frontend après une action utilisateur.
     * POST /notifications/trigger
     */
    public function trigger(Request $request): JsonResponse
    {
        $request->validate([
            'event'      => 'required|string',
            'booking_id' => 'nullable|integer',
        ]);

        $event     = $request->input('event');
        $bookingId = $request->input('booking_id');
        $user      = $request->user();

        $payload = match ($event) {
            'booking.created'   => $this->bookingCreated($user, $bookingId),
            'booking.confirmed' => $this->bookingConfirmed($user, $bookingId),
            'booking.cancelled' => $this->bookingCancelled($user, $bookingId),
            'booking.completed' => $this->bookingCompleted($user, $bookingId),
            default             => null,
        };

        if ($payload) {
            $this->send($payload);
        }

        return response()->json(['ok' => true]);
    }

    // ─── Builders de payload ─────────────────────────────────────────────────

    private function bookingCreated($user, ?int $bookingId): array
    {
        $booking = $bookingId ? Booking::with('accommodation')->find($bookingId) : null;
        $name    = $booking?->accommodation?->name ?? 'votre hébergement';

        return [
            'include_external_user_ids' => [(string) $user->id],
            'headings'                  => ['fr' => 'Réservation enregistrée !', 'en' => 'Booking received!'],
            'contents'                  => [
                'fr' => "Votre demande de réservation pour {$name} a bien été reçue.",
                'en' => "Your booking request for {$name} has been received.",
            ],
            'url'                       => config('app.frontend_url') . "/bookings/{$bookingId}",
            'data'                      => ['event' => 'booking.created', 'booking_id' => $bookingId],
        ];
    }

    private function bookingConfirmed($user, ?int $bookingId): array
    {
        $booking = $bookingId ? Booking::with('accommodation')->find($bookingId) : null;
        $name    = $booking?->accommodation?->name ?? 'votre hébergement';
        $code    = $booking?->confirmation_code ?? '';

        return [
            'include_external_user_ids' => [(string) $user->id],
            'headings'                  => ['fr' => 'Réservation confirmée !', 'en' => 'Booking confirmed!'],
            'contents'                  => [
                'fr' => "Votre réservation chez {$name} est confirmée. Code : {$code}",
                'en' => "Your booking at {$name} is confirmed. Code: {$code}",
            ],
            'url'                       => config('app.frontend_url') . "/bookings/{$bookingId}",
            'data'                      => ['event' => 'booking.confirmed', 'booking_id' => $bookingId],
        ];
    }

    private function bookingCancelled($user, ?int $bookingId): array
    {
        $booking = $bookingId ? Booking::with('accommodation')->find($bookingId) : null;
        $name    = $booking?->accommodation?->name ?? 'votre hébergement';

        return [
            'include_external_user_ids' => [(string) $user->id],
            'headings'                  => ['fr' => 'Réservation annulée', 'en' => 'Booking cancelled'],
            'contents'                  => [
                'fr' => "Votre réservation chez {$name} a été annulée. Consultez vos réservations pour les détails.",
                'en' => "Your booking at {$name} has been cancelled. Check your bookings for details.",
            ],
            'url'                       => config('app.frontend_url') . "/bookings/{$bookingId}",
            'data'                      => ['event' => 'booking.cancelled', 'booking_id' => $bookingId],
        ];
    }

    private function bookingCompleted($user, ?int $bookingId): array
    {
        $booking = $bookingId ? Booking::with('accommodation')->find($bookingId) : null;
        $name    = $booking?->accommodation?->name ?? 'votre hébergement';

        return [
            'include_external_user_ids' => [(string) $user->id],
            'headings'                  => ['fr' => 'Séjour terminé — merci !', 'en' => 'Stay completed — thank you!'],
            'contents'                  => [
                'fr' => "Votre séjour chez {$name} est terminé. Partagez votre expérience en laissant un avis !",
                'en' => "Your stay at {$name} is over. Share your experience by leaving a review!",
            ],
            'url'                       => config('app.frontend_url') . "/bookings/{$bookingId}/review",
            'data'                      => ['event' => 'booking.completed', 'booking_id' => $bookingId],
        ];
    }

    // ─── Envoi vers l'API OneSignal ───────────────────────────────────────────

    private function send(array $payload): void
    {
        if (empty($this->appId) || empty($this->apiKey)) {
            Log::warning('OneSignal: app_id ou api_key manquant dans la config.');
            return;
        }

        try {
            Http::withHeaders([
                'Authorization' => "Key {$this->apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://onesignal.com/api/v1/notifications', array_merge($payload, [
                'app_id'           => $this->appId,
                'channel_for_external_user_ids' => 'push',
            ]));
        } catch (\Throwable $e) {
            Log::error('OneSignal send error: ' . $e->getMessage());
        }
    }

    // ─── Notification utilisateur à l'inscription (appelé depuis AuthController) ──

    public static function notifyWelcome($user): void
    {
        $appId  = config('services.onesignal.app_id', '');
        $apiKey = config('services.onesignal.api_key', '');

        if (empty($appId) || empty($apiKey)) return;

        try {
            Http::withHeaders([
                'Authorization' => "Key {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://onesignal.com/api/v1/notifications', [
                'app_id'                        => $appId,
                'channel_for_external_user_ids' => 'push',
                'include_external_user_ids'     => [(string) $user->id],
                'headings'                      => ['fr' => 'Bienvenue sur Bosejour !', 'en' => 'Welcome to Bosejour!'],
                'contents'                      => [
                    'fr' => 'Votre compte a été créé avec succès. Explorez les meilleurs hébergements en Côte d\'Ivoire.',
                    'en' => 'Your account has been created. Explore the best accommodations in Côte d\'Ivoire.',
                ],
                'url'                           => config('app.frontend_url', 'https://bosejour.ci'),
            ]);
        } catch (\Throwable $e) {
            Log::error('OneSignal welcome error: ' . $e->getMessage());
        }
    }
}
