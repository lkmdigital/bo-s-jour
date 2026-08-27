<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Inspection;
use App\Models\Payment;
use App\Models\Review;
use App\Models\User;
use Carbon\Carbon;

/**
 * Assistant IA Administrateur (doc client "MODULE IA BOSÉJOUR" §1) —
 * l'administrateur interroge la plateforme en langage naturel. Couvre :
 * - §1.1 Assistant Conversationnel (4 questions d'exemple du doc)
 * - §1.2 Recherche Intelligente (établissements, voyageurs, partenaires,
 *   réservations, paiements, inspections — métadonnées uniquement, jamais
 *   le contenu des documents d'identité : "tickets support" n'existe pas
 *   dans la plateforme, "documents" reste couvert par le module Conformité
 *   existant, pas dupliqué ici)
 * - §1.3 Génération de Rapports + §1.4 Analyse des Performances
 *   (get_business_report, get_top_bottom_establishments)
 * - §1.5 Détection des Anomalies (get_anomaly_signals)
 * - §1.8 Assistant Décisionnel (pas un outil séparé — instruction du prompt
 *   système pour formuler une recommandation concrète à partir des données
 *   des autres outils, comme l'exemple du doc)
 *
 * Voir AiAssistantService pour le socle commun (client Anthropic, boucle
 * d'outils). Contrôle de conformité IA et détection de fraude (§1.6-1.7) :
 * hors périmètre, nécessitent une décision de confidentialité (documents
 * d'identité) à trancher avec le client avant de commencer.
 */
class AdminAiAssistantService extends AiAssistantService
{
    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
Tu es l'assistant IA administrateur de la plateforme bo séjour (hébergements
en Côte d'Ivoire). Réponds aux questions de l'administrateur UNIQUEMENT à
partir des résultats des outils fournis, qui interrogent les données réelles
de la plateforme.

Règles :
- N'invente jamais de chiffre ou de nom d'établissement absent des résultats d'outils.
- Si la question sort du périmètre des outils disponibles, dis-le clairement
  plutôt que d'improviser une réponse.
- Réponds en français, de façon concise et directe (quelques phrases, pas de
  longue analyse sauf si la question le demande explicitement).
- Les montants sont en FCFA.
- Quand la question porte sur un rapport, une analyse de performance ou une
  anomalie détectée, termine par une recommandation d'action concrète et
  proportionnée (ex : "Les réservations à San Pedro ont baissé de 18% ce
  mois-ci. Il est recommandé de lancer une campagne promotionnelle ciblée."),
  jamais une recommandation générique déconnectée des chiffres fournis.
PROMPT;
    }

    protected function toolDefinitions(): array
    {
        return [
            [
                'name' => 'get_pending_establishments',
                'description' => "Liste les établissements en attente de validation (status = pending), avec leur nom, ville, hôte et date de soumission.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'count_bookings',
                'description' => "Compte les réservations enregistrées (tous statuts) sur les N derniers jours.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'days' => ['type' => 'integer', 'description' => 'Fenêtre en jours (ex : 7 pour "cette semaine", 30 pour "ce mois-ci")'],
                    ],
                    'required' => ['days'],
                ],
            ],
            [
                'name' => 'get_inactive_establishments',
                'description' => "Liste les établissements publiés n'ayant reçu aucune réservation confirmée depuis N jours.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'days' => ['type' => 'integer', 'description' => 'Nombre de jours d\'inactivité (ex : 90)'],
                    ],
                    'required' => ['days'],
                ],
            ],
            [
                'name' => 'get_revenue_by_city',
                'description' => "Chiffre d'affaires (réservations confirmées) regroupé par ville, du plus élevé au plus faible. La plateforme ne suit pas de découpage administratif par région, seulement par ville.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'search_records',
                'description' => "Recherche par nom/email/code parmi les établissements, partenaires, voyageurs, réservations, paiements ou inspections. Retourne des métadonnées uniquement (jamais le contenu de documents d'identité).",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'entity' => [
                            'type' => 'string',
                            'enum' => ['accommodation', 'host', 'user', 'booking', 'payment', 'inspection'],
                            'description' => 'accommodation=établissement, host=partenaire, user=voyageur, booking=réservation, payment=paiement, inspection=inspection',
                        ],
                        'query' => ['type' => 'string', 'description' => 'Nom, e-mail, code de confirmation ou référence recherchés'],
                    ],
                    'required' => ['entity', 'query'],
                ],
            ],
            [
                'name' => 'get_business_report',
                'description' => "Rapport d'activité sur les N derniers jours (CA, réservations, annulations, taux d'occupation), comparé à la période équivalente précédente pour dégager une tendance.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'days' => ['type' => 'integer', 'description' => 'Longueur de la période en jours (ex : 7 pour un rapport hebdomadaire, 30 pour mensuel, 365 pour annuel)'],
                    ],
                    'required' => ['days'],
                ],
            ],
            [
                'name' => 'get_top_bottom_establishments',
                'description' => "Établissements les plus performants et les moins performants (CA, nombre de réservations confirmées) sur les N derniers jours.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'days' => ['type' => 'integer', 'description' => 'Fenêtre en jours'],
                        'limit' => ['type' => 'integer', 'description' => 'Nombre d\'établissements à retourner de chaque côté (défaut 5)'],
                    ],
                    'required' => ['days'],
                ],
            ],
            [
                'name' => 'get_anomaly_signals',
                'description' => "Signaux d'alerte : compare les 7 derniers jours aux 7 jours précédents (réservations, chiffre d'affaires, annulations, avis signalés) et liste les établissements inactifs depuis 90 jours.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
        ];
    }

    protected function executeTool(string $name, array $input): string
    {
        return match ($name) {
            'get_pending_establishments' => $this->getPendingEstablishments(),
            'count_bookings' => $this->countBookings((int) ($input['days'] ?? 7)),
            'get_inactive_establishments' => $this->getInactiveEstablishments((int) ($input['days'] ?? 90)),
            'get_revenue_by_city' => $this->getRevenueByCity(),
            'search_records' => $this->searchRecords((string) ($input['entity'] ?? ''), (string) ($input['query'] ?? '')),
            'get_business_report' => $this->getBusinessReport((int) ($input['days'] ?? 7)),
            'get_top_bottom_establishments' => $this->getTopBottomEstablishments((int) ($input['days'] ?? 30), (int) ($input['limit'] ?? 5)),
            'get_anomaly_signals' => $this->getAnomalySignals(),
            default => json_encode(['error' => "Outil inconnu : {$name}"]),
        };
    }

    private function getPendingEstablishments(): string
    {
        $establishments = Accommodation::where('status', 'pending')
            ->with('host:id,name')
            ->orderBy('created_at')
            ->limit(50)
            ->get(['id', 'name', 'city', 'host_id', 'created_at']);

        return json_encode([
            'count' => $establishments->count(),
            'establishments' => $establishments->map(fn (Accommodation $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'city' => $a->city,
                'host_name' => $a->host->name ?? null,
                'submitted_at' => $a->created_at?->toDateString(),
            ]),
        ]);
    }

    private function countBookings(int $days): string
    {
        $days = max(1, min(365, $days));
        $since = now()->subDays($days);

        $count = Booking::where('created_at', '>=', $since)->count();

        return json_encode([
            'period_days' => $days,
            'since' => $since->toDateString(),
            'bookings_count' => $count,
        ]);
    }

    private function getInactiveEstablishments(int $days): string
    {
        $days = max(1, min(730, $days));
        $since = now()->subDays($days);

        $establishments = Accommodation::where('status', 'published')
            ->whereDoesntHave('bookings', function ($q) use ($since) {
                $q->where('status', 'confirmed')->where('created_at', '>=', $since);
            })
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'city']);

        return json_encode([
            'inactivity_days' => $days,
            'count' => $establishments->count(),
            'establishments' => $establishments->map(fn (Accommodation $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'city' => $a->city,
            ]),
        ]);
    }

    private function getRevenueByCity(): string
    {
        $rows = Booking::join('accommodations', 'accommodations.id', '=', 'bookings.accommodation_id')
            ->where('bookings.status', 'confirmed')
            ->selectRaw('accommodations.city as city, SUM(bookings.total_price) as revenue, COUNT(*) as bookings_count')
            ->groupBy('accommodations.city')
            ->orderByDesc('revenue')
            ->limit(20)
            ->get();

        return json_encode([
            'note' => 'Regroupement par ville — aucun découpage par région administrative dans la plateforme.',
            'cities' => $rows->map(fn ($r) => [
                'city' => $r->city,
                'revenue' => (float) $r->revenue,
                'bookings_count' => (int) $r->bookings_count,
            ]),
        ]);
    }

    /**
     * §1.2 — recherche par nom/e-mail/code. Chaque entité correspond à une
     * requête Eloquent fixe et paramétrée (jamais de SQL construit par le
     * modèle) ; jamais de contenu de document d'identité dans les résultats.
     */
    private function searchRecords(string $entity, string $query): string
    {
        $query = trim($query);
        if ($query === '') {
            return json_encode(['error' => 'Terme de recherche vide.']);
        }
        $like = '%' . $query . '%';

        return match ($entity) {
            'accommodation' => $this->searchAccommodations($like),
            'host' => $this->searchUsersByRole($like, 'host'),
            'user' => $this->searchUsersByRole($like, 'user'),
            'booking' => $this->searchBookings($query),
            'payment' => $this->searchPayments($query),
            'inspection' => $this->searchInspections($like),
            default => json_encode(['error' => "Entité de recherche inconnue : {$entity}"]),
        };
    }

    private function searchAccommodations(string $like): string
    {
        $rows = Accommodation::where('name', 'like', $like)
            ->orWhere('city', 'like', $like)
            ->orderBy('name')
            ->limit(15)
            ->get(['id', 'name', 'city', 'status']);

        return json_encode(['results' => $rows]);
    }

    private function searchUsersByRole(string $like, string $role): string
    {
        $rows = User::where('role', $role)
            ->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)->orWhere('email', 'like', $like);
            })
            ->orderBy('name')
            ->limit(15)
            ->get(['id', 'name', 'email', 'status']);

        return json_encode(['results' => $rows]);
    }

    private function searchBookings(string $query): string
    {
        $rows = Booking::where('confirmation_code', $query)
            ->orWhere('booking_number', 'like', "%{$query}%")
            ->with(['user:id,name', 'accommodation:id,name'])
            ->orderByDesc('created_at')
            ->limit(15)
            ->get(['id', 'confirmation_code', 'booking_number', 'status', 'check_in', 'check_out', 'total_price', 'user_id', 'accommodation_id']);

        return json_encode([
            'results' => $rows->map(fn (Booking $b) => [
                'confirmation_code' => $b->confirmation_code,
                'booking_number' => $b->booking_number,
                'status' => $b->status instanceof \BackedEnum ? $b->status->value : $b->status,
                'traveler_name' => $b->user->name ?? null,
                'accommodation_name' => $b->accommodation->name ?? null,
                'check_in' => $b->check_in,
                'check_out' => $b->check_out,
                'total_price' => (float) $b->total_price,
            ]),
        ]);
    }

    private function searchPayments(string $query): string
    {
        $rows = Payment::where('transaction_id', 'like', "%{$query}%")
            ->orWhere('payment_reference', 'like', "%{$query}%")
            ->orWhereHas('booking', fn ($q) => $q->where('confirmation_code', $query))
            ->with('booking:id,confirmation_code')
            ->orderByDesc('created_at')
            ->limit(15)
            ->get(['id', 'booking_id', 'amount', 'status', 'payment_method', 'paid_at']);

        return json_encode([
            'results' => $rows->map(fn (Payment $p) => [
                'booking_confirmation_code' => $p->booking->confirmation_code ?? null,
                'amount' => (float) $p->amount,
                'status' => $p->status,
                'payment_method' => $p->payment_method,
                'paid_at' => $p->paid_at,
            ]),
        ]);
    }

    private function searchInspections(string $like): string
    {
        $rows = Inspection::whereHas('accommodation', fn ($q) => $q->where('name', 'like', $like))
            ->with('accommodation:id,name')
            ->orderByDesc('created_at')
            ->limit(15)
            ->get(['id', 'accommodation_id', 'status', 'score', 'scheduled_at', 'completed_at']);

        return json_encode([
            'results' => $rows->map(fn (Inspection $i) => [
                'accommodation_name' => $i->accommodation->name ?? null,
                'status' => $i->status,
                'score' => $i->score,
                'scheduled_at' => $i->scheduled_at,
                'completed_at' => $i->completed_at,
            ]),
        ]);
    }

    /**
     * §1.3 (rapport) + §1.4 (analyse des performances) — mêmes métriques,
     * comparées à la période équivalente précédente pour que Claude puisse
     * dégager une tendance (dans un sens comme dans l'autre).
     */
    private function getBusinessReport(int $days): string
    {
        $days = max(1, min(366, $days));
        $currentStart = now()->subDays($days);
        $previousStart = now()->subDays($days * 2);

        return json_encode([
            'period_days' => $days,
            'current_period' => $this->periodMetrics($currentStart, now()),
            'previous_equivalent_period' => $this->periodMetrics($previousStart, $currentStart),
        ]);
    }

    private function periodMetrics(Carbon $start, Carbon $end): array
    {
        $revenue = (float) Booking::where('status', 'confirmed')
            ->whereBetween('created_at', [$start, $end])
            ->sum('total_price');

        $bookingsCount = Booking::whereBetween('created_at', [$start, $end])->count();

        // Pas de colonne cancelled_at dédiée : updated_at est l'approximation
        // disponible la plus fiable du moment de l'annulation.
        $cancelledCount = Booking::where('status', 'cancelled')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $totalNights = Booking::where('status', 'confirmed')
            ->whereBetween('check_in', [$start, $end])
            ->get()
            ->sum(fn ($b) => Carbon::parse($b->check_in)->diffInDays(Carbon::parse($b->check_out)));

        $totalRooms = Accommodation::where('status', 'published')->withCount('rooms')->get()->sum('rooms_count');
        $periodDays = max(1, $start->diffInDays($end));
        $availableNights = $totalRooms * $periodDays;
        $occupancyRate = $availableNights > 0 ? round(($totalNights / $availableNights) * 100, 1) : 0;

        return [
            'revenue_fcfa' => $revenue,
            'bookings_count' => $bookingsCount,
            'cancelled_count' => $cancelledCount,
            'occupancy_rate_percent' => $occupancyRate,
        ];
    }

    private function getTopBottomEstablishments(int $days, int $limit): string
    {
        $days = max(1, min(366, $days));
        $limit = max(1, min(20, $limit));
        $since = now()->subDays($days);

        $rows = Accommodation::where('status', 'published')
            ->withSum(['bookings' => function ($q) use ($since) {
                $q->where('status', 'confirmed')->where('created_at', '>=', $since);
            }], 'total_price')
            ->withCount(['bookings' => function ($q) use ($since) {
                $q->where('status', 'confirmed')->where('created_at', '>=', $since);
            }])
            ->get(['id', 'name', 'city']);

        $sorted = $rows->sortByDesc(fn ($a) => (float) ($a->bookings_sum_total_price ?? 0))->values();
        $format = fn ($a) => [
            'name' => $a->name,
            'city' => $a->city,
            'revenue_fcfa' => (float) ($a->bookings_sum_total_price ?? 0),
            'bookings_count' => (int) $a->bookings_count,
        ];

        return json_encode([
            'period_days' => $days,
            'top' => $sorted->take($limit)->map($format)->values(),
            'bottom' => $sorted->reverse()->take($limit)->map($format)->values(),
        ]);
    }

    /**
     * §1.5 — réutilise periodMetrics() (semaine courante vs précédente) et
     * getInactiveEstablishments() déjà existant, plutôt que de dupliquer la
     * logique. "Réclamations" = avis avec report_count > 0, approximés par
     * leur updated_at faute d'horodatage de signalement dédié.
     */
    private function getAnomalySignals(): string
    {
        $thisWeekStart = now()->subDays(7);
        $lastWeekStart = now()->subDays(14);

        $thisWeek = $this->periodMetrics($thisWeekStart, now());
        $lastWeek = $this->periodMetrics($lastWeekStart, $thisWeekStart);

        $reportsThisWeek = Review::where('report_count', '>', 0)
            ->whereBetween('updated_at', [$thisWeekStart, now()])
            ->count();
        $reportsLastWeek = Review::where('report_count', '>', 0)
            ->whereBetween('updated_at', [$lastWeekStart, $thisWeekStart])
            ->count();

        $inactive = json_decode($this->getInactiveEstablishments(90), true);

        return json_encode([
            'note' => "Comparaison des 7 derniers jours aux 7 jours précédents. 'reported_reviews' approximé par updated_at, faute d'horodatage de signalement dédié.",
            'bookings_count' => ['this_week' => $thisWeek['bookings_count'], 'last_week' => $lastWeek['bookings_count']],
            'revenue_fcfa' => ['this_week' => $thisWeek['revenue_fcfa'], 'last_week' => $lastWeek['revenue_fcfa']],
            'cancelled_count' => ['this_week' => $thisWeek['cancelled_count'], 'last_week' => $lastWeek['cancelled_count']],
            'reported_reviews' => ['this_week' => $reportsThisWeek, 'last_week' => $reportsLastWeek],
            'inactive_establishments_90d_count' => $inactive['count'] ?? null,
        ]);
    }
}
