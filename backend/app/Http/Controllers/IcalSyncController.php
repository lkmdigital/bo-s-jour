<?php

namespace App\Http\Controllers;

use App\Models\Accommodation;
use App\Models\RoomAvailability;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Sabre\VObject\Reader;

/**
 * Étape "Synchronisation (Channel Manager)" du configurateur guidé — brief Extranet
 * Partenaire, Étape 18.
 *
 * Import iCal réellement fonctionnel : l'hôte colle le lien iCal exporté par Booking.com,
 * Airbnb ou son PMS ; on le récupère, on parse les événements (VEVENT = période
 * réservée/indisponible côté externe) et on bloque les dates correspondantes sur TOUTES
 * les chambres de l'établissement (côté RoomAvailability, statut "blocked").
 *
 * La "connexion API XML bidirectionnelle en temps réel" avec Booking.com/Airbnb décrite
 * dans le même brief n'est PAS implémentée : elle suppose un partenariat API direct avec
 * ces plateformes que nous n'avons pas. On se contente d'enregistrer l'intérêt du
 * partenaire (channel_manager_interest_requested_at) — voir requestChannelManagerAccess().
 */
class IcalSyncController extends Controller
{
    // Fenêtre de recherche des événements futurs à bloquer — au-delà, on ignore (évite
    // qu'un flux mal formé ou avec des événements très lointains ne génère des milliers
    // de lignes de disponibilité inutiles).
    private const MAX_SYNC_DAYS_AHEAD = 548; // ~18 mois

    private function authorizeAccommodation(Request $request, int $id): Accommodation
    {
        $accommodation = Accommodation::findOrFail($id);
        $user = $request->user();
        if (!$user || $accommodation->host_id !== $user->hostScopeId()) {
            abort(403, 'Non autorisé.');
        }
        return $accommodation;
    }

    public function show(Request $request, $id)
    {
        $accommodation = $this->authorizeAccommodation($request, (int) $id);

        return response()->json([
            'ical_import_url' => $accommodation->ical_import_url,
            'ical_last_synced_at' => $accommodation->ical_last_synced_at,
            'ical_last_sync_status' => $accommodation->ical_last_sync_status,
            'ical_last_sync_error' => $accommodation->ical_last_sync_error,
            'ical_last_sync_events_count' => $accommodation->ical_last_sync_events_count,
            'channel_manager_interest_requested_at' => $accommodation->channel_manager_interest_requested_at,
        ]);
    }

    /**
     * Enregistre (ou met à jour) le lien iCal et lance immédiatement une synchronisation.
     */
    public function sync(Request $request, $id)
    {
        $accommodation = $this->authorizeAccommodation($request, (int) $id);

        $data = $request->validate([
            'url' => 'required|url|max:2048',
        ]);

        if (!$this->isSafeExternalUrl($data['url'])) {
            return response()->json([
                'message' => "Cette adresse n'est pas autorisée. Utilisez le lien iCal public fourni par votre plateforme (Booking.com, Airbnb, PMS…).",
            ], 422);
        }

        $accommodation->ical_import_url = $data['url'];
        $accommodation->save();

        return $this->performSync($accommodation);
    }

    /**
     * Relance une synchronisation avec le lien déjà enregistré.
     */
    public function resync(Request $request, $id)
    {
        $accommodation = $this->authorizeAccommodation($request, (int) $id);

        if (!$accommodation->ical_import_url) {
            return response()->json(['message' => "Aucun lien iCal enregistré."], 422);
        }

        return $this->performSync($accommodation);
    }

    public function disconnect(Request $request, $id)
    {
        $accommodation = $this->authorizeAccommodation($request, (int) $id);

        $accommodation->update([
            'ical_import_url' => null,
            'ical_last_synced_at' => null,
            'ical_last_sync_status' => null,
            'ical_last_sync_error' => null,
            'ical_last_sync_events_count' => null,
        ]);

        return response()->json(['message' => 'Synchronisation iCal désactivée.']);
    }

    /**
     * "Connexion API XML" du brief : aucun partenariat API réel avec Booking.com/Airbnb —
     * on se contente d'enregistrer que ce partenaire est intéressé, pour prioriser un futur
     * partenariat plutôt que de faire semblant de synchroniser quoi que ce soit.
     */
    public function requestChannelManagerAccess(Request $request, $id)
    {
        $accommodation = $this->authorizeAccommodation($request, (int) $id);

        $accommodation->update(['channel_manager_interest_requested_at' => now()]);

        Log::info('Channel manager (API XML) interest requested', [
            'accommodation_id' => $accommodation->id,
            'host_id' => $accommodation->host_id,
        ]);

        return response()->json([
            'message' => "Votre intérêt a été enregistré. Notre équipe vous contactera dès qu'une connexion API sera disponible.",
            'channel_manager_interest_requested_at' => $accommodation->fresh()->channel_manager_interest_requested_at,
        ]);
    }

    private function performSync(Accommodation $accommodation)
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders(['User-Agent' => 'bosejour-ical-sync/1.0'])
                ->get($accommodation->ical_import_url);

            if (!$response->successful()) {
                throw new \RuntimeException("Le calendrier distant a répondu avec le code {$response->status()}.");
            }

            $body = $response->body();
            if (strlen($body) > 5 * 1024 * 1024) {
                throw new \RuntimeException('Le fichier iCal est trop volumineux.');
            }
            if (trim($body) === '' || !str_contains($body, 'BEGIN:VCALENDAR')) {
                throw new \RuntimeException("Le contenu récupéré n'est pas un calendrier iCal valide.");
            }

            $vcalendar = Reader::read($body);

            $today = Carbon::today();
            $maxDate = $today->copy()->addDays(self::MAX_SYNC_DAYS_AHEAD);
            $ranges = [];

            foreach ($vcalendar->VEVENT ?? [] as $event) {
                if (!isset($event->DTSTART)) {
                    continue;
                }
                $start = Carbon::instance($event->DTSTART->getDateTime())->startOfDay();

                if (isset($event->DTEND)) {
                    $end = Carbon::instance($event->DTEND->getDateTime())->startOfDay();
                } elseif (isset($event->DURATION)) {
                    $end = $start->copy()->add($event->DURATION->getDateInterval());
                } else {
                    // Événement "journée entière" sans fin explicite : une seule nuit bloquée.
                    $end = $start->copy()->addDay();
                }

                if ($end->lte($start) || $end->lt($today) || $start->gt($maxDate)) {
                    continue; // événement dégénéré, entièrement passé, ou trop lointain
                }

                $ranges[] = [
                    $start->lt($today) ? $today->copy() : $start,
                    $end->gt($maxDate) ? $maxDate->copy() : $end,
                ];
            }

            $roomIds = $accommodation->rooms()->pluck('id');

            $existing = RoomAvailability::whereIn('room_id', $roomIds)
                ->where('date', '>=', $today->toDateString())
                ->get(['room_id', 'date', 'status'])
                ->keyBy(fn ($r) => $r->room_id . '|' . $r->date->toDateString());

            $blockedDates = [];
            $rowsToUpsert = [];
            $now = now();

            foreach ($ranges as [$start, $end]) {
                $cursor = $start->copy();
                while ($cursor->lt($end)) {
                    $dateStr = $cursor->toDateString();
                    $blockedDates[$dateStr] = true;
                    foreach ($roomIds as $roomId) {
                        $current = $existing->get($roomId . '|' . $dateStr);
                        // Ne jamais écraser une réservation réelle ("occupied") ni un blocage
                        // manuel de l'hôte ("maintenance") avec un blocage importé.
                        if ($current && in_array($current->status, ['occupied', 'maintenance'], true)) {
                            continue;
                        }
                        $rowsToUpsert[] = [
                            'room_id' => $roomId,
                            'date' => $dateStr,
                            'status' => 'blocked',
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                    $cursor->addDay();
                }
            }

            // On repart d'une base propre pour les anciens blocages importés (futurs
            // uniquement) : un événement annulé côté externe doit libérer la date ici aussi.
            RoomAvailability::whereIn('room_id', $roomIds)
                ->where('status', 'blocked')
                ->where('date', '>=', $today->toDateString())
                ->delete();

            if (!empty($rowsToUpsert)) {
                RoomAvailability::upsert($rowsToUpsert, ['room_id', 'date'], ['status', 'updated_at']);
            }

            $accommodation->update([
                'ical_last_synced_at' => now(),
                'ical_last_sync_status' => 'success',
                'ical_last_sync_error' => null,
                'ical_last_sync_events_count' => count($ranges),
            ]);

            return response()->json([
                'message' => 'Synchronisation réussie.',
                'events_count' => count($ranges),
                'dates_blocked' => count($blockedDates),
                'ical_last_synced_at' => $accommodation->ical_last_synced_at,
            ]);
        } catch (\Throwable $e) {
            Log::warning('iCal sync failed', [
                'accommodation_id' => $accommodation->id,
                'url' => $accommodation->ical_import_url,
                'error' => $e->getMessage(),
            ]);

            $accommodation->update([
                'ical_last_synced_at' => now(),
                'ical_last_sync_status' => 'error',
                'ical_last_sync_error' => substr($e->getMessage(), 0, 500),
            ]);

            return response()->json([
                'message' => 'La synchronisation a échoué : ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Garde-fou anti-SSRF : le lien iCal est fourni par l'hôte, notre serveur va le
     * récupérer lui-même — on refuse tout ce qui ne ressemble pas à une URL publique
     * (schéma non http/https, localhost, plages d'IP privées/locales).
     */
    private function isSafeExternalUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (!$parts || !in_array($parts['scheme'] ?? '', ['http', 'https'], true) || empty($parts['host'])) {
            return false;
        }

        $host = strtolower($parts['host']);
        if ($host === 'localhost' || str_ends_with($host, '.local')) {
            return false;
        }

        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips[] = $host;
        } else {
            $resolved = @gethostbynamel($host);
            if ($resolved) {
                $ips = $resolved;
            }
        }

        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }

        return true;
    }
}
