<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MarketingCampaign;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Commercialisation — campagnes marketing par notification push (OneSignal),
 * segmentées par critères de profil. Réutilise le même mécanisme déjà en
 * production pour les notifications transactionnelles (NotificationController) :
 * include_external_user_ids = liste d'IDs utilisateur.
 *
 * Portée assumée : un seul canal (push), pas d'e-mail marketing ici (le
 * service OneSignal e-mail existant est une intégration ancienne, désactivée
 * par défaut, et non re-brandée — pas fiable à réutiliser sans validation).
 */
class AdminMarketingController extends Controller
{
    public function previewSegment(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = $this->buildSegmentQuery($request);
        $count = (clone $query)->count();
        $sample = (clone $query)->orderByDesc('created_at')->limit(5)->get(['id', 'name', 'email', 'city', 'role']);

        return response()->json(['count' => $count, 'sample' => $sample]);
    }

    public function store(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'body' => 'required|string|max:500',
            'url' => 'nullable|url|max:500',
            'role' => 'nullable|string|in:user,host,all',
            'city' => 'nullable|string|max:100',
            'traveler_type' => 'nullable|string|in:individual,corporate,all',
            'activity' => 'nullable|string|in:all,never_booked,has_booked,inactive_30d',
            'registered_after' => 'nullable|date',
            'registered_before' => 'nullable|date',
        ]);

        $filters = collect($validated)->only([
            'role', 'city', 'traveler_type', 'activity', 'registered_after', 'registered_before',
        ])->filter()->all();

        $userIds = $this->buildSegmentQuery($request)->pluck('id')->map(fn ($id) => (string) $id)->values()->all();

        if (count($userIds) === 0) {
            return response()->json(['message' => 'Aucun destinataire ne correspond à ces critères.'], 422);
        }

        $campaign = MarketingCampaign::create([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'url' => $validated['url'] ?? null,
            'filters' => $filters,
            'recipients_count' => count($userIds),
            'status' => 'sent',
            'sent_by' => $request->user()->id,
        ]);

        $appId = (string) config('services.onesignal.app_id', '');
        $apiKey = (string) config('services.onesignal.api_key', '');

        if ($appId === '' || $apiKey === '') {
            $campaign->update(['status' => 'failed', 'error' => 'Configuration OneSignal manquante (app_id/api_key).']);
            return response()->json(['message' => 'Configuration OneSignal manquante.', 'data' => $campaign], 422);
        }

        try {
            // OneSignal limite la taille d'un lot d'IDs par appel ; on segmente par
            // prudence même si la volumétrie actuelle de la plateforme reste modeste.
            foreach (array_chunk($userIds, 2000) as $chunk) {
                $payload = [
                    'app_id' => $appId,
                    'channel_for_external_user_ids' => 'push',
                    'include_external_user_ids' => $chunk,
                    'headings' => ['fr' => $validated['title']],
                    'contents' => ['fr' => $validated['body']],
                ];
                if (!empty($validated['url'])) {
                    $payload['url'] = $validated['url'];
                }

                $response = Http::withHeaders([
                    'Authorization' => "Key {$apiKey}",
                    'Content-Type' => 'application/json',
                ])->post('https://onesignal.com/api/v1/notifications', $payload);

                if ($response->failed()) {
                    throw new \RuntimeException('OneSignal a répondu ' . $response->status() . ' : ' . $response->body());
                }
            }
        } catch (\Throwable $e) {
            Log::error('Marketing campaign send failed', ['campaign_id' => $campaign->id, 'error' => $e->getMessage()]);
            $campaign->update(['status' => 'failed', 'error' => $e->getMessage()]);
            return response()->json(['message' => "Échec de l'envoi : " . $e->getMessage(), 'data' => $campaign], 502);
        }

        return response()->json(['message' => 'Campagne envoyée', 'data' => $campaign], 201);
    }

    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $campaigns = MarketingCampaign::with('sender:id,name')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $campaigns->items(),
            'pagination' => [
                'current_page' => $campaigns->currentPage(),
                'last_page' => $campaigns->lastPage(),
                'per_page' => $campaigns->perPage(),
                'total' => $campaigns->total(),
            ],
        ]);
    }

    /** Villes distinctes des voyageurs/hôtes, pour peupler le filtre. */
    public function cities(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Dédoublonnage insensible à la casse ("Abidjan" / "abidjan") : on garde une
        // seule graphie par ville (la plus fréquente) pour peupler le filtre.
        $cities = User::whereIn('role', ['user', 'host'])
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->select('city', DB::raw('COUNT(*) as c'))
            ->groupBy('city')
            ->orderByDesc('c')
            ->get()
            ->groupBy(fn ($row) => mb_strtolower($row->city))
            ->map(fn ($group) => $group->first()->city)
            ->sort()
            ->values();

        return response()->json(['data' => $cities]);
    }

    private function buildSegmentQuery(Request $request)
    {
        $role = $request->get('role', 'user');
        $query = User::where('status', 'active');

        if ($role !== 'all') {
            $query->where('role', $role);
        } else {
            // Jamais les admins dans une campagne marketing.
            $query->whereIn('role', ['user', 'host']);
        }

        if ($request->filled('city')) {
            // Comparaison insensible à la casse : la ville est saisie librement par
            // l'utilisateur ("Abidjan" / "abidjan" désignent le même segment).
            $query->whereRaw('LOWER(city) = ?', [mb_strtolower($request->city)]);
        }

        if ($request->filled('traveler_type') && $request->traveler_type !== 'all') {
            $query->where('traveler_type', $request->traveler_type);
        }

        if ($request->filled('activity')) {
            switch ($request->activity) {
                case 'never_booked':
                    $query->whereDoesntHave('bookings');
                    break;
                case 'has_booked':
                    $query->whereHas('bookings');
                    break;
                case 'inactive_30d':
                    $query->where(function ($q) {
                        $q->whereNull('last_login_at')->orWhere('last_login_at', '<=', now()->subDays(30));
                    });
                    break;
            }
        }

        if ($request->filled('registered_after')) {
            $query->whereDate('created_at', '>=', $request->registered_after);
        }
        if ($request->filled('registered_before')) {
            $query->whereDate('created_at', '<=', $request->registered_before);
        }

        return $query;
    }
}
