<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Assistant IA Partenaire (doc client "MODULE IA BOSÉJOUR" §2). Couvre :
 * - §2.1 Assistant Conversationnel (3 questions d'exemple du doc)
 * - §2.5 Analyse de la Fiche Établissement (get_listing_quality_score)
 * - §2.6 Tarification Intelligente (get_pricing_context)
 * - §2.7 Gestion Intelligente des Promotions (get_promotion_context)
 * - §2.8 Analyse Commerciale détaillée (get_commercial_analysis)
 * - §2.9 Prévisions (get_revenue_forecast — projection linéaire indicative,
 *   explicitement PAS un modèle prédictif, même principe que le Tableau
 *   stratégique admin déjà construit)
 * - §2.11 Analyse des Avis (get_recent_reviews — avis publics de l'hôte,
 *   c'est Claude qui synthétise thèmes/satisfaction à partir du texte brut,
 *   aucun pré-calcul de sentiment maison)
 * - §2.12 Détection d'Anomalies (get_anomaly_signals)
 * - §2.14 Tableau de Bord Intelligent (get_daily_summary)
 *
 * Chaque outil est scopé côté serveur à l'hôte authentifié via hostScopeId()
 * — jamais un paramètre que le modèle pourrait fournir — donc structurellement
 * impossible pour un hôte de lire les données d'un autre par ce biais, quelle
 * que soit la question posée.
 *
 * Génération de contenu, traduction, SEO, réponses assistées aux messages
 * privés voyageur, assistant de conformité (§2.2-2.4, §2.10 partiel, §2.13
 * du doc) : hors périmètre, vagues suivantes du plan (le dernier nécessite
 * une décision de confidentialité côté client, documents d'identité).
 */
class HostAiAssistantService extends AiAssistantService
{
    public function __construct(private readonly User $host)
    {
    }

    protected function logContext(): string
    {
        return 'HostAiAssistantService(host_id=' . $this->host->hostScopeId() . ')';
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
Tu es l'assistant IA partenaire de la plateforme bo séjour (hébergements en
Côte d'Ivoire). Réponds aux questions de l'hôte UNIQUEMENT à partir des
résultats des outils fournis, qui interrogent les données réelles de SES
propres établissements — jamais celles d'un autre partenaire.

Règles :
- N'invente jamais de chiffre ou de nom de chambre/établissement absent des résultats d'outils.
- Si la question sort du périmètre des outils disponibles, dis-le clairement
  plutôt que d'improviser une réponse.
- Réponds en français, de façon concise et directe (quelques phrases, pas de
  longue analyse sauf si la question le demande explicitement).
- Les montants sont en FCFA.
- Toute suggestion (tarif, promotion, contenu) reste une recommandation
  facultative — l'hôte garde le contrôle complet, ne présente jamais un
  conseil comme une décision déjà prise.
- Pour les prévisions, rappelle toujours qu'il s'agit d'une estimation
  indicative basée sur l'historique récent, pas une prédiction garantie.
PROMPT;
    }

    protected function toolDefinitions(): array
    {
        return [
            [
                'name' => 'get_occupancy_rate',
                'description' => "Taux d'occupation de l'hôte sur les 30 derniers jours, tous établissements confondus.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_next_payout',
                'description' => "Solde actuellement disponible pour retrait (commissions déjà libérées par la plateforme, pas encore versées à l'hôte).",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_most_profitable_room',
                'description' => "Classe les chambres de l'hôte par chiffre d'affaires généré (réservations confirmées), de la plus rentable à la moins rentable.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_listing_quality_score',
                'description' => "Score de complétude de la fiche de chaque établissement de l'hôte (description, photos, équipements, tarification) avec les manques identifiés.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_pricing_context',
                'description' => "Compare le tarif de chaque établissement de l'hôte au prix moyen des établissements publiés dans la même ville, avec le taux d'occupation actuel. Ne couvre pas les événements locaux ni la saisonnalité (données absentes de la plateforme).",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_promotion_context',
                'description' => "Liste les promotions actives de l'hôte et la répartition des réservations par jour de la semaine sur les 8 dernières semaines, pour identifier les créneaux à faible demande.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_commercial_analysis',
                'description' => "Chiffre d'affaires par chambre et taux d'occupation semaine par semaine (4 dernières semaines) pour repérer les périodes creuses et les chambres les moins performantes.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_revenue_forecast',
                'description' => "Projection indicative du chiffre d'affaires à 30/90/365 jours, basée sur une simple tendance linéaire des 8 dernières semaines — PAS un modèle prédictif réel.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_recent_reviews',
                'description' => "Avis récents (note + commentaire) des établissements de l'hôte, pour en dégager les points forts, les points faibles et les thèmes récurrents.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'limit' => ['type' => 'integer', 'description' => "Nombre d'avis à retourner (défaut 20)"],
                    ],
                ],
            ],
            [
                'name' => 'get_anomaly_signals',
                'description' => "Compare les 7 derniers jours aux 7 jours précédents (réservations, chiffre d'affaires, annulations) sur les établissements de l'hôte.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_daily_summary',
                'description' => "Résumé du jour : arrivées et départs prévus, nouvelles réservations, avis en attente de réponse.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
        ];
    }

    protected function executeTool(string $name, array $input): string
    {
        return match ($name) {
            'get_occupancy_rate' => $this->getOccupancyRate(),
            'get_next_payout' => $this->getNextPayout(),
            'get_most_profitable_room' => $this->getMostProfitableRoom(),
            'get_listing_quality_score' => $this->getListingQualityScore(),
            'get_pricing_context' => $this->getPricingContext(),
            'get_promotion_context' => $this->getPromotionContext(),
            'get_commercial_analysis' => $this->getCommercialAnalysis(),
            'get_revenue_forecast' => $this->getRevenueForecast(),
            'get_recent_reviews' => $this->getRecentReviews((int) ($input['limit'] ?? 20)),
            'get_anomaly_signals' => $this->getAnomalySignals(),
            'get_daily_summary' => $this->getDailySummary(),
            default => json_encode(['error' => "Outil inconnu : {$name}"]),
        };
    }

    /**
     * Même formule que AnalyticsController::hostDashboard() (30 derniers
     * jours) — pour que le chiffre donné par l'assistant corresponde
     * exactement à celui affiché sur le tableau de bord Statistiques.
     */
    private function getOccupancyRate(): string
    {
        $hostId = $this->host->hostScopeId();

        $totalNights = Booking::whereHas('accommodation', function ($q) use ($hostId) {
                $q->where('host_id', $hostId);
            })
            ->where('status', 'confirmed')
            ->where('check_in', '>=', Carbon::now()->subDays(30))
            ->get()
            ->sum(fn ($b) => Carbon::parse($b->check_in)->diffInDays(Carbon::parse($b->check_out)));

        $totalRooms = Accommodation::where('host_id', $hostId)->withCount('rooms')->get()->sum('rooms_count');
        $availableNights = $totalRooms * 30;
        $occupancyRate = $availableNights > 0 ? ($totalNights / $availableNights) * 100 : 0;

        return json_encode([
            'period_days' => 30,
            'total_rooms' => $totalRooms,
            'occupancy_rate_percent' => round($occupancyRate, 1),
        ]);
    }

    /**
     * Même requête que HostWithdrawalController::availableBalance() — le
     * chiffre donné par l'assistant doit correspondre exactement au solde
     * affiché sur la page Retraits.
     */
    private function getNextPayout(): string
    {
        $hostId = $this->host->hostScopeId();

        $balance = (float) Commission::where('host_id', $hostId)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->sum('host_amount');

        return json_encode([
            'available_balance_fcfa' => $balance,
            'note' => "Solde des commissions déjà libérées par la plateforme, pas encore versées — correspond à la page Retraits.",
        ]);
    }

    private function getMostProfitableRoom(): string
    {
        $hostId = $this->host->hostScopeId();

        $rows = DB::table('bookings')
            ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
            ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
            ->where('accommodations.host_id', $hostId)
            ->where('bookings.status', 'confirmed')
            ->select(
                'rooms.id as room_id',
                // Même repli que l'accessor Room::name() (name -> type -> "Chambre"),
                // rejoué en SQL brut car cette requête passe par le query builder,
                // pas par le modèle Eloquent.
                DB::raw("COALESCE(rooms.name, rooms.type, 'Chambre') as room_name"),
                'accommodations.name as accommodation_name',
                DB::raw('SUM(bookings.total_price) as revenue'),
                DB::raw('COUNT(*) as bookings_count')
            )
            ->groupBy('rooms.id', 'rooms.name', 'rooms.type', 'accommodations.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        return json_encode([
            'rooms' => $rows->map(fn ($r) => [
                'room_name' => $r->room_name,
                'accommodation_name' => $r->accommodation_name,
                'revenue_fcfa' => (float) $r->revenue,
                'bookings_count' => (int) $r->bookings_count,
            ]),
        ]);
    }

    /**
     * §2.5 — score indicatif /100 (25 pts par critère), pas une note
     * officielle bo séjour. Objectif : donner à Claude de quoi pointer des
     * manques concrets, pas produire un chiffre définitif.
     */
    private function getListingQualityScore(): string
    {
        $hostId = $this->host->hostScopeId();

        $accommodations = Accommodation::where('host_id', $hostId)
            ->withCount(['images', 'rooms'])
            ->get(['id', 'name', 'description', 'amenities', 'price_per_night']);

        return json_encode([
            'note' => 'Score indicatif sur 100 (25 points par critère : description, photos, équipements, tarification) — pas une note officielle bo séjour.',
            'establishments' => $accommodations->map(function (Accommodation $a) {
                $hasDescription = mb_strlen((string) $a->description) >= 50;
                $photosCount = (int) $a->images_count;
                $amenitiesCount = is_array($a->amenities) ? count($a->amenities) : 0;
                $hasPricing = (float) $a->price_per_night > 0 && (int) $a->rooms_count > 0;

                $score = 0;
                $gaps = [];

                if ($hasDescription) {
                    $score += 25;
                } else {
                    $gaps[] = 'description absente ou trop courte';
                }

                if ($photosCount >= 5) {
                    $score += 25;
                } elseif ($photosCount > 0) {
                    $score += 12;
                    $gaps[] = 'moins de 5 photos';
                } else {
                    $gaps[] = 'aucune photo';
                }

                if ($amenitiesCount >= 5) {
                    $score += 25;
                } elseif ($amenitiesCount > 0) {
                    $score += 12;
                    $gaps[] = 'peu d\'équipements renseignés';
                } else {
                    $gaps[] = 'aucun équipement renseigné';
                }

                if ($hasPricing) {
                    $score += 25;
                } else {
                    $gaps[] = 'tarification ou chambres incomplètes';
                }

                return [
                    'name' => $a->name,
                    'score_out_of_100' => $score,
                    'photos_count' => $photosCount,
                    'amenities_count' => $amenitiesCount,
                    'gaps' => $gaps,
                ];
            }),
        ]);
    }

    /**
     * §2.6 — la plateforme ne suit ni événements locaux ni saisonnalité :
     * comparaison honnête limitée au prix moyen de la ville et à l'occupation.
     */
    private function getPricingContext(): string
    {
        $hostId = $this->host->hostScopeId();
        $accommodations = Accommodation::where('host_id', $hostId)->get(['id', 'name', 'city', 'price_per_night']);

        $establishments = $accommodations->map(function (Accommodation $a) {
            $cityAverage = Accommodation::where('status', 'published')
                ->where('city', $a->city)
                ->where('id', '!=', $a->id)
                ->avg('price_per_night');

            return [
                'name' => $a->name,
                'city' => $a->city,
                'current_price_fcfa' => (float) $a->price_per_night,
                'city_average_price_fcfa' => $cityAverage !== null ? round((float) $cityAverage) : null,
            ];
        });

        $occupancy = json_decode($this->getOccupancyRate(), true);

        return json_encode([
            'note' => "La plateforme ne suit pas les événements locaux ni la saisonnalité — comparaison basée uniquement sur le prix moyen de la ville et le taux d'occupation actuel.",
            'establishments' => $establishments,
            'occupancy_rate_percent_30d' => $occupancy['occupancy_rate_percent'] ?? null,
        ]);
    }

    /**
     * §2.7 — répartition par jour de semaine sur 8 semaines pour repérer
     * les créneaux à faible demande (ex : suggérer une "promotion week-end"
     * si le week-end est structurellement sous-rempli, ou l'inverse).
     */
    private function getPromotionContext(): string
    {
        $hostId = $this->host->hostScopeId();

        $activePromotions = Promotion::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('is_active', true)
            ->where('end_date', '>=', now())
            ->with('accommodation:id,name')
            ->get(['id', 'accommodation_id', 'discount_type', 'discount_percent', 'discount_amount', 'end_date']);

        $bookings = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('status', 'confirmed')
            ->where('check_in', '>=', now()->subWeeks(8))
            ->get(['check_in']);

        $byWeekday = $bookings
            ->groupBy(fn ($b) => Carbon::parse($b->check_in)->locale('fr')->isoFormat('dddd'))
            ->map(fn ($group) => $group->count());

        return json_encode([
            'active_promotions' => $activePromotions->map(fn (Promotion $p) => [
                'accommodation_name' => $p->accommodation->name ?? null,
                'discount_type' => $p->discount_type,
                'discount_percent' => $p->discount_percent,
                'ends_at' => $p->end_date,
            ]),
            'bookings_by_weekday_last_8_weeks' => $byWeekday,
        ]);
    }

    /**
     * §2.8 — réutilise get_most_profitable_room() et le même calcul
     * d'occupation hebdomadaire que AnalyticsController::hostDashboard()
     * (occupancyByWeek) pour repérer les périodes creuses.
     */
    private function getCommercialAnalysis(): string
    {
        $hostId = $this->host->hostScopeId();
        $rooms = json_decode($this->getMostProfitableRoom(), true)['rooms'] ?? [];

        $totalRooms = Accommodation::where('host_id', $hostId)->withCount('rooms')->get()->sum('rooms_count');
        $occupancyByWeek = [];
        for ($i = 3; $i >= 0; $i--) {
            $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
            $weekEnd = (clone $weekStart)->endOfWeek();

            $nightsSold = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
                ->where('status', 'confirmed')
                ->where('check_in', '<=', $weekEnd)
                ->where('check_out', '>=', $weekStart)
                ->get()
                ->sum(function ($b) use ($weekStart, $weekEnd) {
                    $start = Carbon::parse($b->check_in)->max($weekStart);
                    $end = Carbon::parse($b->check_out)->min($weekEnd);
                    return max(0, $start->diffInDays($end));
                });

            $available = $totalRooms * 7;
            $occupancyByWeek[] = [
                'week_label' => 'S' . (4 - $i),
                'occupancy_rate_percent' => $available > 0 ? round(($nightsSold / $available) * 100, 1) : 0,
            ];
        }

        return json_encode([
            'rooms_by_revenue' => $rooms,
            'occupancy_by_week' => $occupancyByWeek,
        ]);
    }

    /**
     * §2.9 — projection linéaire indicative, PAS un modèle prédictif réel
     * (même principe que le Tableau stratégique admin : honnête sur ses
     * propres limites plutôt que de simuler une fausse précision).
     */
    private function getRevenueForecast(): string
    {
        $hostId = $this->host->hostScopeId();

        $weeks = [];
        for ($i = 7; $i >= 0; $i--) {
            $start = Carbon::now()->subWeeks($i)->startOfWeek();
            $end = (clone $start)->endOfWeek();
            $weeks[] = (float) Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
                ->where('status', 'confirmed')
                ->whereBetween('created_at', [$start, $end])
                ->sum('total_price');
        }

        $avgWeekly = array_sum($weeks) / count($weeks);
        $recentAvg = array_sum(array_slice($weeks, -4)) / 4;
        $priorAvg = array_sum(array_slice($weeks, 0, 4)) / 4;
        $trendFactor = $priorAvg > 0 ? $recentAvg / $priorAvg : 1;

        $projected = fn (int $days) => round($avgWeekly * ($days / 7) * $trendFactor);

        return json_encode([
            'note' => "Projection linéaire indicative basée sur les 8 dernières semaines de chiffre d'affaires — PAS un modèle prédictif réel, à utiliser comme simple ordre de grandeur.",
            'average_weekly_revenue_fcfa' => round($avgWeekly),
            'trend_factor' => round($trendFactor, 2),
            'projected_revenue_fcfa' => [
                '30_days' => $projected(30),
                '90_days' => $projected(90),
                '365_days' => $projected(365),
            ],
        ]);
    }

    /**
     * §2.11 — avis déjà publics (moderation_status=approved), texte brut
     * transmis tel quel : c'est Claude qui synthétise thèmes/satisfaction,
     * aucun pré-calcul de sentiment maison.
     */
    private function getRecentReviews(int $limit): string
    {
        $hostId = $this->host->hostScopeId();
        $limit = max(1, min(50, $limit));

        $reviews = Review::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('moderation_status', 'approved')
            ->with('accommodation:id,name')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get(['id', 'accommodation_id', 'rating', 'comment', 'created_at']);

        return json_encode([
            'reviews' => $reviews->map(fn (Review $r) => [
                'accommodation_name' => $r->accommodation->name ?? null,
                'rating' => $r->rating,
                'comment' => $r->comment,
                'date' => $r->created_at?->toDateString(),
            ]),
        ]);
    }

    private function getAnomalySignals(): string
    {
        $hostId = $this->host->hostScopeId();
        $thisWeekStart = now()->subDays(7);
        $lastWeekStart = now()->subDays(14);

        $thisWeek = $this->hostPeriodMetrics($hostId, $thisWeekStart, now());
        $lastWeek = $this->hostPeriodMetrics($hostId, $lastWeekStart, $thisWeekStart);

        return json_encode([
            'note' => 'Comparaison des 7 derniers jours aux 7 jours précédents.',
            'bookings_count' => ['this_week' => $thisWeek['bookings_count'], 'last_week' => $lastWeek['bookings_count']],
            'revenue_fcfa' => ['this_week' => $thisWeek['revenue_fcfa'], 'last_week' => $lastWeek['revenue_fcfa']],
            'cancelled_count' => ['this_week' => $thisWeek['cancelled_count'], 'last_week' => $lastWeek['cancelled_count']],
        ]);
    }

    private function hostPeriodMetrics(int $hostId, Carbon $start, Carbon $end): array
    {
        $revenue = (float) Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('status', 'confirmed')
            ->whereBetween('created_at', [$start, $end])
            ->sum('total_price');

        $bookingsCount = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Pas de colonne cancelled_at dédiée : updated_at est l'approximation
        // disponible la plus fiable du moment de l'annulation.
        $cancelledCount = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('status', 'cancelled')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        return ['revenue_fcfa' => $revenue, 'bookings_count' => $bookingsCount, 'cancelled_count' => $cancelledCount];
    }

    private function getDailySummary(): string
    {
        $hostId = $this->host->hostScopeId();
        $today = Carbon::today();

        $arrivals = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('status', 'confirmed')
            ->whereDate('check_in', $today)
            ->count();

        $departures = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('status', 'confirmed')
            ->whereDate('check_out', $today)
            ->count();

        $newBookingsToday = Booking::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->whereDate('created_at', $today)
            ->count();

        $reviewsToHandle = Review::whereHas('accommodation', fn ($q) => $q->where('host_id', $hostId))
            ->where('moderation_status', 'approved')
            ->whereNull('host_reply')
            ->count();

        return json_encode([
            'date' => $today->toDateString(),
            'arrivals_today' => $arrivals,
            'departures_today' => $departures,
            'new_bookings_today' => $newBookingsToday,
            'reviews_awaiting_reply' => $reviewsToHandle,
        ]);
    }
}
