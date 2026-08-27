<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\LoyaltyCampaign;
use App\Models\LoyaltyRewardTier;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyVoucher;
use App\Models\Review;
use App\Models\User;

/**
 * Assistant IA Voyageur (doc client "MODULE IA BOSÉJOUR" §3). Couvre :
 * - §3.1 Assistant Conversationnel + §3.3 Recherche Intelligente
 *   (search_accommodations — recherche en langage naturel sur les
 *   établissements publiés)
 * - §3.4 Comparateur Intelligent (compare_accommodations)
 * - §3.6 Assistant de Réservation (get_accommodation_details — politiques
 *   d'annulation, tarifs, services inclus)
 * - §3.8 Traduction : pas un outil séparé — capacité linguistique native de
 *   Claude, le voyageur colle un texte reçu d'un hôte et demande une
 *   traduction directement dans la conversation, aucune donnée à interroger.
 * - §3.10 Assistance Après le Séjour (get_recent_stay_for_review)
 * - §3.11 Gestion du Programme Membre (get_loyalty_status — réutilise
 *   exactement la même logique que LoyaltyController::show())
 * - §3.14 Assistance en Cas de Problème (get_my_bookings — premier niveau de
 *   support en s'appuyant sur les réservations réelles du voyageur)
 * - §3.2 Recommandations Personnalisées + §3.13 Recommandations Prédictives
 *   (get_my_travel_profile — préférences déclarées + historique réel de
 *   séjours, combiné par Claude avec search_accommodations pour proposer des
 *   établissements PUBLIÉS RÉELS qui correspondent, jamais une recommandation
 *   inventée. Aucune donnée d'événement local : la plateforme n'en a pas,
 *   assumé explicitement plutôt que simulé)
 *
 * Chaque outil touchant des données personnelles est scopé côté serveur au
 * voyageur authentifié via $this->traveler->id — jamais un paramètre que le
 * modèle pourrait fournir — même principe que HostAiAssistantService.
 * search_accommodations/get_accommodation_details/compare_accommodations
 * n'exposent que des établissements publiés, déjà publics sur la plateforme.
 *
 * Planificateur de séjour, concierge numérique, recommandations in-séjour,
 * alertes intelligentes (§3.5, §3.7, §3.9, §3.12 du doc) : hors périmètre,
 * nécessitent des données externes (météo, tourisme local) absentes de la
 * plateforme — vague séparée du plan, question de périmètre pas de
 * confidentialité.
 */
class TravelerAiAssistantService extends AiAssistantService
{
    public function __construct(private readonly User $traveler)
    {
    }

    protected function logContext(): string
    {
        return 'TravelerAiAssistantService(user_id=' . $this->traveler->id . ')';
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
Tu es l'assistant IA voyageur de la plateforme bo séjour (hébergements en
Côte d'Ivoire). Aide le voyageur à trouver un hébergement, comprendre les
conditions de réservation, suivre son programme de fidélité et répondre à
ses questions sur ses propres réservations — à partir UNIQUEMENT des
résultats des outils fournis.

Règles :
- N'invente jamais de nom d'établissement, de prix ou de politique absent
  des résultats d'outils.
- Les outils de recherche/détails/comparaison ne portent que sur des
  établissements publiés (déjà publics sur la plateforme) ; les outils de
  réservation et de fidélité ne portent que sur le compte du voyageur qui
  pose la question, jamais celui d'un autre voyageur.
- Si le voyageur colle un texte à traduire (message reçu d'un hôte, par
  exemple), traduis-le directement — ce n'est pas une donnée à interroger.
- Pour une recommandation personnalisée, croise get_my_travel_profile (ses
  préférences et son historique) avec search_accommodations (les
  établissements publiés réellement disponibles) : ne recommande jamais un
  établissement qui ne sort pas de search_accommodations. La plateforme ne
  connaît pas les événements locaux à venir — dis-le si le voyageur en
  demande, ne l'invente jamais.
- Si la question sort de ton périmètre (assistance en cas de litige grave,
  remboursement, problème de paiement bloquant), oriente clairement vers le
  support bo séjour plutôt que d'improviser une solution.
- Réponds en français, de façon concise et chaleureuse.
- Les montants sont en FCFA.
PROMPT;
    }

    protected function toolDefinitions(): array
    {
        return [
            [
                'name' => 'search_accommodations',
                'description' => "Recherche des établissements publiés selon des critères (ville, budget, capacité, mots-clés, équipements souhaités). Comprend les recherches en langage naturel complexes en les traduisant en filtres.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'city' => ['type' => 'string', 'description' => 'Ville recherchée (ex : Assinie, Abidjan)'],
                        'max_price' => ['type' => 'number', 'description' => 'Budget maximum par nuit en FCFA'],
                        'max_guests' => ['type' => 'integer', 'description' => 'Nombre de voyageurs à accueillir'],
                        'amenities' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Équipements souhaités (ex : ["piscine", "parking sécurisé"])'],
                        'keywords' => ['type' => 'string', 'description' => 'Mots-clés libres (ex : "calme", "proche de la plage") recherchés dans le nom/la description'],
                    ],
                ],
            ],
            [
                'name' => 'get_accommodation_details',
                'description' => "Détails complets d'un établissement précis : description, tarif, politique d'annulation, caution, petit-déjeuner, horaires d'arrivée/départ — pour expliquer les conditions de réservation.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'accommodation_id' => ['type' => 'integer', 'description' => "Identifiant de l'établissement, obtenu via search_accommodations"],
                    ],
                    'required' => ['accommodation_id'],
                ],
            ],
            [
                'name' => 'compare_accommodations',
                'description' => "Compare 2 à 5 établissements publiés côte à côte (prix, équipements, note, ville).",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'accommodation_ids' => ['type' => 'array', 'items' => ['type' => 'integer'], 'description' => 'Identifiants des établissements à comparer'],
                    ],
                    'required' => ['accommodation_ids'],
                ],
            ],
            [
                'name' => 'get_my_bookings',
                'description' => "Réservations du voyageur qui pose la question (jamais celles d'un autre), avec statut, dates et établissement — utile pour répondre à des questions sur une réservation précise.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'status' => ['type' => 'string', 'enum' => ['pending', 'confirmed', 'cancelled', 'completed'], 'description' => 'Filtre optionnel par statut'],
                    ],
                ],
            ],
            [
                'name' => 'get_loyalty_status',
                'description' => "Niveau, points, prochain palier, bons de réduction disponibles et code de parrainage du voyageur dans le Programme Membre.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_recent_stay_for_review',
                'description' => "Dernier séjour terminé du voyageur (30 derniers jours) et indique s'il a déjà laissé un avis, pour l'inviter à partager son expérience.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_my_travel_profile',
                'description' => "Préférences déclarées du voyageur (type d'hébergement préféré, budget moyen, région) et résumé de son historique de séjours confirmés (villes visitées, prix moyen payé, types d'établissements réservés, équipements fréquemment présents). À combiner avec search_accommodations pour des recommandations personnalisées ancrées dans des établissements réels.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
        ];
    }

    protected function executeTool(string $name, array $input): string
    {
        return match ($name) {
            'search_accommodations' => $this->searchAccommodations($input),
            'get_accommodation_details' => $this->getAccommodationDetails((int) ($input['accommodation_id'] ?? 0)),
            'compare_accommodations' => $this->compareAccommodations(array_map('intval', $input['accommodation_ids'] ?? [])),
            'get_my_bookings' => $this->getMyBookings($input['status'] ?? null),
            'get_loyalty_status' => $this->getLoyaltyStatus(),
            'get_recent_stay_for_review' => $this->getRecentStayForReview(),
            'get_my_travel_profile' => $this->getMyTravelProfile(),
            default => json_encode(['error' => "Outil inconnu : {$name}"]),
        };
    }

    /**
     * Filtre ville/prix/capacité au niveau BDD, puis équipements en
     * sous-chaîne insensible à la casse en PHP (les libellés d'équipements
     * ne sont pas normalisés en base — "Piscine" vs "piscine" — un filtre
     * JSON exact serait trop fragile pour une recherche en langage naturel).
     */
    private function searchAccommodations(array $input): string
    {
        $query = Accommodation::where('status', 'published');

        if (!empty($input['city'])) {
            $query->where('city', 'like', '%' . $input['city'] . '%');
        }
        if (!empty($input['max_price'])) {
            $query->where('price_per_night', '<=', (float) $input['max_price']);
        }
        if (!empty($input['max_guests'])) {
            $query->where('max_guests', '>=', (int) $input['max_guests']);
        }
        if (!empty($input['keywords'])) {
            $kw = '%' . $input['keywords'] . '%';
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'like', $kw)->orWhere('description', 'like', $kw);
            });
        }

        $results = $query->orderByDesc('rating')
            ->limit(50)
            ->get(['id', 'name', 'city', 'price_per_night', 'max_guests', 'rating', 'total_reviews', 'amenities']);

        if (!empty($input['amenities']) && is_array($input['amenities'])) {
            $wanted = array_map(fn ($a) => mb_strtolower((string) $a), $input['amenities']);
            $results = $results->filter(function (Accommodation $a) use ($wanted) {
                $have = array_map(fn ($x) => mb_strtolower((string) $x), is_array($a->amenities) ? $a->amenities : []);
                foreach ($wanted as $w) {
                    $matched = false;
                    foreach ($have as $h) {
                        if (str_contains($h, $w) || str_contains($w, $h)) {
                            $matched = true;
                            break;
                        }
                    }
                    if (!$matched) {
                        return false;
                    }
                }
                return true;
            });
        }

        $results = $results->take(10)->values();

        return json_encode([
            'count' => $results->count(),
            'results' => $results->map(fn (Accommodation $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'city' => $a->city,
                'price_per_night_fcfa' => (float) $a->price_per_night,
                'max_guests' => $a->max_guests,
                'rating' => $a->rating,
                'total_reviews' => $a->total_reviews,
                'amenities' => $a->amenities,
            ]),
        ]);
    }

    private function getAccommodationDetails(int $id): string
    {
        $a = Accommodation::where('status', 'published')->find($id);
        if (!$a) {
            return json_encode(['error' => 'Établissement introuvable ou non publié.']);
        }

        return json_encode([
            'name' => $a->name,
            'city' => $a->city,
            'description' => $a->description,
            'price_per_night_fcfa' => (float) $a->price_per_night,
            'max_guests' => $a->max_guests,
            'bedrooms' => $a->bedrooms,
            'bathrooms' => $a->bathrooms,
            'amenities' => $a->amenities,
            'rating' => $a->rating,
            'total_reviews' => $a->total_reviews,
            'cancellation_policy_hours' => $a->cancellation_policy_hours,
            'deposit_required' => (bool) $a->deposit_required,
            'deposit_amount_fcfa' => $a->deposit_required ? (float) $a->deposit_amount : null,
            'breakfast_included' => (bool) $a->breakfast_included,
            'check_in_time' => $a->check_in_time,
            'check_out_time' => $a->check_out_time,
        ]);
    }

    private function compareAccommodations(array $ids): string
    {
        $ids = array_slice(array_filter($ids), 0, 5);
        if (count($ids) < 2) {
            return json_encode(['error' => 'Au moins deux établissements sont nécessaires pour une comparaison.']);
        }

        $rows = Accommodation::where('status', 'published')
            ->whereIn('id', $ids)
            ->get(['id', 'name', 'city', 'price_per_night', 'max_guests', 'rating', 'total_reviews', 'amenities']);

        return json_encode([
            'establishments' => $rows->map(fn (Accommodation $a) => [
                'name' => $a->name,
                'city' => $a->city,
                'price_per_night_fcfa' => (float) $a->price_per_night,
                'max_guests' => $a->max_guests,
                'rating' => $a->rating,
                'total_reviews' => $a->total_reviews,
                'amenities' => $a->amenities,
            ]),
        ]);
    }

    private function getMyBookings(?string $status): string
    {
        $query = Booking::where('user_id', $this->traveler->id)
            ->with('accommodation:id,name,city')
            ->orderByDesc('created_at');

        if ($status) {
            $query->where('status', $status);
        }

        $rows = $query->limit(15)->get(['id', 'confirmation_code', 'booking_number', 'status', 'check_in', 'check_out', 'total_price', 'accommodation_id']);

        return json_encode([
            'bookings' => $rows->map(fn (Booking $b) => [
                'confirmation_code' => $b->confirmation_code,
                'booking_number' => $b->booking_number,
                'status' => $b->status instanceof \BackedEnum ? $b->status->value : $b->status,
                'accommodation_name' => $b->accommodation->name ?? null,
                'city' => $b->accommodation->city ?? null,
                'check_in' => $b->check_in,
                'check_out' => $b->check_out,
                'total_price_fcfa' => (float) $b->total_price,
            ]),
        ]);
    }

    /**
     * Même logique que LoyaltyController::show() — le chiffre donné par
     * l'assistant doit correspondre exactement à ce qu'affiche
     * /dashboard/user/programme.
     */
    private function getLoyaltyStatus(): string
    {
        $user = $this->traveler;

        $tiers = LoyaltyTier::active()->ordered()->get();
        $currentTier = $tiers->firstWhere('key', $user->loyalty_tier);
        $nextTier = $tiers->first(fn (LoyaltyTier $t) => $t->min_points > $user->loyalty_points_lifetime);

        $vouchers = LoyaltyVoucher::where('user_id', $user->id)
            ->where('status', 'available')
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn (LoyaltyVoucher $v) => [
                'code' => $v->code,
                'discount_percent' => (float) $v->discount_percent,
                'expires_at' => $v->expires_at,
            ]);

        $claimableRewardTiers = LoyaltyRewardTier::active()->ordered()
            ->where('points_required', '<=', $user->loyalty_points_balance)
            ->get()
            ->map(fn (LoyaltyRewardTier $rt) => [
                'points_required' => $rt->points_required,
                'discount_percent' => (float) $rt->discount_percent,
            ]);

        $activeCampaigns = LoyaltyCampaign::currentlyActive()->orderBy('ends_at')->get(['name', 'multiplier', 'bonus_points', 'ends_at']);

        return json_encode([
            'tier' => $currentTier?->label,
            'points_balance' => (int) $user->loyalty_points_balance,
            'points_lifetime' => (int) $user->loyalty_points_lifetime,
            'next_tier' => $nextTier ? ['label' => $nextTier->label, 'points_required' => $nextTier->min_points, 'points_remaining' => max(0, $nextTier->min_points - $user->loyalty_points_lifetime)] : null,
            'available_vouchers' => $vouchers,
            'claimable_reward_tiers' => $claimableRewardTiers,
            'active_campaigns' => $activeCampaigns,
            'referral_code' => $user->referral_code,
        ]);
    }

    /**
     * Même critère de séjour "réalisé" que le Programme de fidélité
     * (status=confirmed, no_show_at NULL, check_out passé) — cohérence avec
     * AwardLoyaltyPoints. "already_reviewed" approximé par user_id+
     * accommodation_id faute de lien direct booking_id sur Review.
     */
    private function getRecentStayForReview(): string
    {
        $booking = Booking::where('user_id', $this->traveler->id)
            ->where('status', 'confirmed')
            ->whereNull('no_show_at')
            ->where('check_out', '<=', now())
            ->where('check_out', '>=', now()->subDays(30))
            ->with('accommodation:id,name')
            ->orderByDesc('check_out')
            ->first();

        if (!$booking) {
            return json_encode(['has_recent_stay' => false]);
        }

        $alreadyReviewed = Review::where('user_id', $this->traveler->id)
            ->where('accommodation_id', $booking->accommodation_id)
            ->exists();

        return json_encode([
            'has_recent_stay' => true,
            'accommodation_name' => $booking->accommodation->name ?? null,
            'check_out' => $booking->check_out,
            'already_reviewed' => $alreadyReviewed,
        ]);
    }

    /**
     * §3.2 + §3.13 — préférences déclarées (déjà collectées via le profil,
     * doc §9-équivalent voyageur) + historique réel de séjours confirmés.
     * Ne calcule aucun "score de préférence" propriétaire : transmet les
     * faits bruts, c'est Claude qui infère et croise avec
     * search_accommodations. Pas de données d'événements locaux/saisonniers
     * dans la plateforme — assumé explicitement dans le prompt système
     * plutôt que simulé ici.
     */
    private function getMyTravelProfile(): string
    {
        $user = $this->traveler;

        $pastBookings = Booking::where('user_id', $user->id)
            ->where('status', 'confirmed')
            ->with('accommodation:id,city,type,price_per_night,amenities')
            ->orderByDesc('check_in')
            ->limit(20)
            ->get();

        $citiesVisited = $pastBookings->pluck('accommodation.city')->filter()->unique()->values();
        $avgPricePaid = $pastBookings->avg(fn ($b) => (float) $b->total_price);
        $typesBooked = $pastBookings->pluck('accommodation.type')->filter()->countBy();

        $amenityCounts = [];
        foreach ($pastBookings as $b) {
            foreach ((array) ($b->accommodation->amenities ?? []) as $amenity) {
                $key = mb_strtolower((string) $amenity);
                $amenityCounts[$key] = ($amenityCounts[$key] ?? 0) + 1;
            }
        }
        arsort($amenityCounts);

        return json_encode([
            'stated_preferences' => [
                'preferred_accommodation_type' => $user->preferred_accommodation_type,
                'average_budget_fcfa' => $user->average_budget,
                'region' => $user->region,
            ],
            'booking_history' => [
                'total_confirmed_stays' => $pastBookings->count(),
                'cities_visited' => $citiesVisited,
                'average_price_paid_per_stay_fcfa' => $avgPricePaid ? round($avgPricePaid) : null,
                'accommodation_types_booked' => $typesBooked,
                'frequently_present_amenities' => array_slice(array_keys($amenityCounts), 0, 5),
            ],
            'note' => "Aucune donnée d'événement local ou de saisonnalité disponible sur la plateforme — les recommandations doivent se baser uniquement sur ces préférences et cet historique.",
        ]);
    }
}
