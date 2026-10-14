<?php

namespace App\Services;

use App\Models\Room;
use Carbon\Carbon;
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
 * - §3.5 Planificateur de Séjour + §3.7 Concierge Numérique + §3.9
 *   Recommandations Pendant le Séjour : la plateforme n'a aucune base
 *   restaurants/activités/météo/urgences — plutôt que de l'inventer,
 *   ces trois points s'appuient sur l'outil serveur `web_search` de Claude
 *   (recherche web réelle, pas une donnée maison), combiné à
 *   search_accommodations pour l'hébergement. Les numéros d'urgence en
 *   particulier ne sont JAMAIS écrits en dur dans ce code : une info fausse
 *   ici serait dangereuse, le prompt système impose de les rechercher à
 *   chaque fois plutôt que de mémoriser une valeur qui pourrait devenir
 *   fausse ou l'avoir toujours été.
 *
 * §3.12 Alertes Intelligentes : pas un outil conversationnel — traité
 * séparément comme une notification événementielle (voir
 * PromotionController::notifyFavoritesOfNewPromotion, "nouvelles
 * promotions" sur les établissements favoris). La confirmation de
 * réservation existe déjà (BookingConfirmedNotification) ; la baisse de
 * prix nécessiterait un historique de prix qui n'existe pas dans la
 * plateforme — non traité, chantier distinct.
 */
class TravelerAiAssistantService extends AiAssistantService
{
    /**
     * Outils ne portant que sur des données déjà publiques (établissements publiés) :
     * les seuls proposés à un visiteur non connecté.
     */
    private const PUBLIC_TOOLS = ['search_accommodations', 'get_accommodation_details', 'compare_accommodations'];

    /**
     * @param User|null $traveler voyageur connecté, ou null pour un visiteur non connecté
     *        (assistant flottant des pages publiques) : il n'a alors accès qu'aux outils
     *        publics, sans recherche web ni donnée de compte.
     */
    public function __construct(private readonly ?User $traveler = null)
    {
    }

    /**
     * Établissements renvoyés par la dernière recherche, prêts à afficher en cartes sous la
     * réponse (photo, prix, lien). Ils ne sont PAS envoyés au modèle sous cette forme : le
     * site les dessine lui-même, ce qui garantit des liens et des prix exacts.
     *
     * @var array<int, array<string, mixed>>
     */
    private array $offers = [];

    /** @return array<int, array<string, mixed>> */
    public function lastOffers(): array
    {
        return $this->offers;
    }

    public function isGuest(): bool
    {
        return $this->traveler === null;
    }

    protected function logContext(): string
    {
        return 'TravelerAiAssistantService(' . ($this->traveler ? 'user_id=' . $this->traveler->id : 'visiteur') . ')';
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
Tu es Bo, l'assistant de séjour de la plateforme boséjour (hébergements en
Côte d'Ivoire). Tu te présentes sous ce nom si on te le demande. Aide le voyageur à trouver un hébergement, comprendre les
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
- Si le voyageur colle un texte à traduire (message reçu d'un partenaire, par
  exemple), traduis-le directement — ce n'est pas une donnée à interroger.
- Pour une recommandation personnalisée, croise get_my_travel_profile (ses
  préférences et son historique) avec search_accommodations (les
  établissements publiés réellement disponibles) : ne recommande jamais un
  établissement qui ne sort pas de search_accommodations. La plateforme ne
  connaît pas les événements locaux à venir — dis-le si le voyageur en
  demande, ne l'invente jamais.
- Pour un itinéraire, des recommandations de restaurants/activités/sites
  touristiques, la météo ou des informations pratiques (transports, numéros
  d'urgence), utilise l'outil de recherche web — ce ne sont pas des données
  de la plateforme. Ne mémorise et n'invente JAMAIS un numéro d'urgence :
  recherche-le systématiquement et rappelle au voyageur de le vérifier
  localement, une information erronée serait dangereuse.
- Si la question sort de ton périmètre (assistance en cas de litige grave,
  remboursement, problème de paiement bloquant), oriente clairement vers le
  support boséjour plutôt que d'improviser une solution.
- Réponds en français, de façon concise et chaleureuse.
- Les montants sont en FCFA.
- Écris en texte simple, sans tableau ni titre : la réponse s'affiche dans une
  petite fenêtre de discussion.
- Pour proposer un séjour, il te faut la ville (ou la zone) ET les dates d'arrivée
  et de départ. S'il manque les dates, propose quand même quelques établissements
  mais précise que la disponibilité n'est pas vérifiée, et demande les dates.
- Dès que tu as les dates, passe check_in et check_out à l'outil : ne propose alors
  QUE les établissements renvoyés (ils sont disponibles), en donnant pour chacun le
  prix total du séjour, puis les options de paiement fournies (paiement intégral avec
  sa réduction, ou garantie de réservation et solde à l'arrivée quand elle existe).
- Les établissements renvoyés par search_accommodations s'affichent automatiquement
  en CARTES sous ta réponse (photo, prix, bouton « Réserver »), dans l'ordre de
  l'outil, les 6 premiers ; le premier porte l'étiquette « Choix de Bo ». Ne recopie
  donc pas la liste ni les liens : présente en une ou deux phrases ce que tu as
  trouvé, dis pourquoi le premier est ton choix, et signale ce qui compte (prix total,
  garantie, équipement demandé). Si tu dois quand même citer un lien, recopie-le
  EXACTEMENT comme l'outil le fournit.
- Tu ne réserves jamais toi-même : le bouton « Réserver » ouvre le formulaire
  prérempli, le voyageur y valide sa demande, puis l'établissement confirme la
  disponibilité avant le paiement.
- Les dates s'écrivent AAAA-MM-JJ pour les outils. Interprète « ce week-end »,
  « le mois prochain », etc. à partir de la date du jour ci-dessous, et annonce les
  dates que tu as retenues.
PROMPT
            . "\n\nDate du jour : " . now()->translatedFormat('l j F Y') . ' (' . now()->toDateString() . ').'
            . " Quand tu écris une date au voyageur, utilise toujours le format français lisible (« 3 novembre 2026 »),"
            . " jamais le format technique AAAA-MM-JJ, que tu réserves aux appels d'outils."
            . ($this->isGuest() ? self::GUEST_NOTICE : '');
    }

    /** Ajout au prompt pour un visiteur non connecté. */
    private const GUEST_NOTICE = <<<'PROMPT'


Le visiteur n'est PAS connecté : tu n'as accès qu'à la recherche, aux détails et
à la comparaison d'établissements publiés. Tu n'as accès à aucune réservation,
aucun compte, aucun programme de fidélité, et pas à la recherche web. S'il pose
une question sur ses réservations, son compte ou ses avantages, invite-le à se
connecter à son espace voyageur (ou à utiliser « Retrouver ma réservation »),
sans rien inventer.
PROMPT;

    protected function toolDefinitions(): array
    {
        $tools = $this->allToolDefinitions();
        if (!$this->isGuest()) {
            return $tools;
        }

        return array_values(array_filter(
            $tools,
            fn (array $tool) => in_array($tool['name'], self::PUBLIC_TOOLS, true) && !isset($tool['type'])
        ));
    }

    /** @return array<int, array<string, mixed>> */
    private function allToolDefinitions(): array
    {
        return [
            [
                'name' => 'search_accommodations',
                'description' => "Recherche des établissements publiés selon des critères (ville, type, budget, capacité, mots-clés, équipements). Si le voyageur donne ses dates, fournis check_in et check_out : seuls les établissements réellement DISPONIBLES sont renvoyés, avec le prix total du séjour, les options de paiement et un lien de réservation prérempli (booking_link). Sans dates, la disponibilité n'est pas vérifiée et seul le tarif de base par nuit est connu.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'city' => ['type' => 'string', 'description' => 'Ville recherchée (ex : Assinie, Abidjan)'],
                        'type' => ['type' => 'string', 'enum' => ['hotel', 'lodge', 'guesthouse', 'apartment'], 'description' => "Type d'hébergement : hotel = hôtel, lodge = écolodge, guesthouse = maison d'hôtes, apartment = résidence/appartement"],
                        'check_in' => ['type' => 'string', 'description' => "Date d'arrivée au format AAAA-MM-JJ"],
                        'check_out' => ['type' => 'string', 'description' => 'Date de départ au format AAAA-MM-JJ'],
                        'max_price' => ['type' => 'number', 'description' => 'Budget maximum par nuit en FCFA'],
                        'max_guests' => ['type' => 'integer', 'description' => 'Nombre de voyageurs à accueillir'],
                        'amenities' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Équipements souhaités (ex : ["piscine", "parking sécurisé"])'],
                        'keywords' => ['type' => 'string', 'description' => 'Mots-clés libres (ex : "calme", "proche de la plage") recherchés dans le nom/la description'],
                    ],
                ],
            ],
            [
                'name' => 'get_accommodation_details',
                'description' => "Détails complets d'un établissement précis : description, tarif, politique d'annulation, garantie de réservation, petit-déjeuner, horaires d'arrivée/départ. Avec check_in et check_out : chambres disponibles sur ces dates, prix total, options de paiement et lien de réservation prérempli.",
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'accommodation_id' => ['type' => 'integer', 'description' => "Identifiant de l'établissement, obtenu via search_accommodations"],
                        'check_in' => ['type' => 'string', 'description' => "Date d'arrivée au format AAAA-MM-JJ (facultatif)"],
                        'check_out' => ['type' => 'string', 'description' => 'Date de départ au format AAAA-MM-JJ (facultatif)'],
                        'guests' => ['type' => 'integer', 'description' => 'Nombre de voyageurs (facultatif)'],
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
            // Outil serveur Anthropic (exécuté par Claude, pas par ce code) —
            // restaurants, activités, sites touristiques, météo, transports,
            // numéros d'urgence : aucune de ces données n'existe dans la
            // plateforme (§3.5, §3.7, §3.9 du doc).
            [
                'type' => 'web_search_20260318',
                'name' => 'web_search',
                'maxUses' => 3,
            ],
        ];
    }

    protected function executeTool(string $name, array $input): string
    {
        // Défense en profondeur : même si le modèle demandait un outil de compte, un
        // visiteur non connecté n'exécute que les outils publics.
        if ($this->isGuest() && !in_array($name, self::PUBLIC_TOOLS, true)) {
            return json_encode(['error' => 'Connexion requise pour cette information.']);
        }

        return match ($name) {
            'search_accommodations' => $this->searchAccommodations($input),
            'get_accommodation_details' => $this->getAccommodationDetails((int) ($input['accommodation_id'] ?? 0), $input),
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
        if (!empty($input['type']) && in_array($input['type'], ['hotel', 'lodge', 'guesthouse', 'apartment'], true)) {
            $query->where('type', $input['type']);
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
            ->with('images')
            ->get();

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

        $guests = max(0, (int) ($input['max_guests'] ?? 0));
        $period = $this->stayPeriod($input);
        if (isset($period['error'])) {
            return json_encode($period);
        }

        $base = fn (Accommodation $a) => [
            'id' => $a->id,
            'name' => $a->name,
            'type' => self::TYPE_LABELS[$a->type] ?? $a->type,
            'city' => $a->city,
            'max_guests' => $a->max_guests,
            'rating' => $a->rating,
            'total_reviews' => $a->total_reviews,
            'amenities' => $a->amenities,
            'listing_link' => '/accommodations/' . $a->id,
        ];

        // Sans dates : pas de disponibilité, seulement le tarif de base par nuit.
        if ($period === null) {
            $results = $results->take(10)->values();
            $this->offers = $results->take(self::MAX_CARDS)
                ->map(fn (Accommodation $a) => $this->card($a, ['price_per_night_fcfa' => (float) $a->price_per_night]))
                ->all();

            return json_encode([
                'count' => $results->count(),
                'dates_checked' => false,
                'note' => "Disponibilité non vérifiée : demande au voyageur ses dates d'arrivée et de départ pour ne proposer que des établissements disponibles, avec le prix total et un lien de réservation.",
                'results' => $results->map(fn (Accommodation $a) => $base($a) + [
                    'price_per_night_fcfa' => (float) $a->price_per_night,
                ]),
            ]);
        }

        // Avec dates : uniquement les établissements ayant une chambre libre, avec leur devis.
        $cards = [];
        $available = [];
        $unavailable = 0;
        foreach ($results as $a) {
            $offer = $this->bestAvailableOffer($a, $period, $guests);
            if ($offer === null) {
                $unavailable++;
                continue;
            }
            if (!empty($input['max_price']) && $offer['price_per_night_fcfa'] > (float) $input['max_price']) {
                continue;
            }
            $available[] = $base($a) + $offer;
            if (count($cards) < self::MAX_CARDS) {
                $cards[] = $this->card($a, $offer + ['nights' => $period['nights'], 'check_in' => $period['check_in'], 'check_out' => $period['check_out']]);
            }
            if (count($available) >= 10) {
                break;
            }
        }
        $this->offers = $cards;

        return json_encode([
            'count' => count($available),
            'dates_checked' => true,
            'check_in' => $period['check_in'],
            'check_out' => $period['check_out'],
            'nights' => $period['nights'],
            'unavailable_on_these_dates' => $unavailable,
            'results' => $available,
        ]);
    }

    /** Nombre maximal de cartes affichées sous une réponse. */
    private const MAX_CARDS = 6;

    /** Carte d'un établissement pour l'interface (jamais envoyée au modèle). */
    private function card(Accommodation $a, array $offer): array
    {
        $image = $a->images->firstWhere('is_primary', true) ?? $a->images->first();

        return [
            'id' => $a->id,
            'name' => $a->name,
            'type' => self::TYPE_LABELS[$a->type] ?? $a->type,
            'city' => $a->city,
            'rating' => $a->rating !== null ? (float) $a->rating : null,
            'photo' => $image?->url,
            'listing_link' => '/accommodations/' . $a->id,
            'price_per_night_fcfa' => $offer['price_per_night_fcfa'] ?? null,
            'total_fcfa' => $offer['total_fcfa'] ?? null,
            'nights' => $offer['nights'] ?? null,
            'check_in' => $offer['check_in'] ?? null,
            'check_out' => $offer['check_out'] ?? null,
            'room' => $offer['room'] ?? null,
            'booking_link' => $offer['booking_link'] ?? null,
        ];
    }

    private const TYPE_LABELS = [
        'hotel' => 'Hôtel',
        'lodge' => 'Écolodge',
        'guesthouse' => "Maison d'hôtes",
        'apartment' => 'Résidence',
    ];

    /**
     * Période demandée, validée : null si aucune date n'est fournie, ['error' => …] si les
     * dates sont inexploitables (le modèle redemande alors au voyageur).
     *
     * @return array{check_in: string, check_out: string, nights: int}|array{error: string}|null
     */
    private function stayPeriod(array $input): ?array
    {
        $in = trim((string) ($input['check_in'] ?? ''));
        $out = trim((string) ($input['check_out'] ?? ''));
        if ($in === '' && $out === '') {
            return null;
        }

        try {
            $checkIn = Carbon::createFromFormat('Y-m-d', $in)->startOfDay();
            $checkOut = Carbon::createFromFormat('Y-m-d', $out)->startOfDay();
        } catch (\Throwable) {
            return ['error' => "Dates invalides : il faut une date d'arrivée ET une date de départ au format AAAA-MM-JJ."];
        }
        if ($checkIn->lt(now()->startOfDay())) {
            return ['error' => "La date d'arrivée est déjà passée. Nous sommes le " . now()->toDateString() . '.'];
        }
        if ($checkOut->lte($checkIn)) {
            return ['error' => "La date de départ doit être postérieure à la date d'arrivée."];
        }

        return [
            'check_in' => $checkIn->toDateString(),
            'check_out' => $checkOut->toDateString(),
            'nights' => (int) $checkIn->diffInDays($checkOut),
        ];
    }

    /**
     * Chambres actives de l'établissement libres sur la période (et assez grandes), avec leur
     * devis. Disponibilité et prix viennent des mêmes services que le parcours de réservation
     * (BookingService::availableUnits, StayQuoteService) : l'assistant n'annonce rien d'autre
     * que ce que la fiche et la page de paiement afficheront.
     *
     * @return array<int, array<string, mixed>> offres triées de la moins chère à la plus chère
     */
    private function availableOffers(Accommodation $a, array $period, int $guests): array
    {
        $checkIn = Carbon::parse($period['check_in']);
        $checkOut = Carbon::parse($period['check_out']);
        $bookings = app(BookingService::class);

        $offers = [];
        foreach (Room::where('accommodation_id', $a->id)->where('is_active', true)->get() as $room) {
            if ($guests > 0 && (int) $room->capacity < $guests) {
                continue;
            }
            $units = $bookings->availableUnits($room, $checkIn, $checkOut);
            if ($units < 1) {
                continue;
            }

            $quote = StayQuoteService::quote($a, $room->id, $period['check_in'], $period['check_out']);
            $options = $quote['payment_options'];
            $guarantee = $options['options']['guarantee'] ?? null;

            $link = '/bookings/new?' . http_build_query(array_filter([
                'accommodation' => $a->id,
                'room' => $room->id,
                'check_in' => $period['check_in'],
                'check_out' => $period['check_out'],
                'guests' => $guests > 0 ? $guests : null,
            ]));

            $offers[] = [
                'room' => $room->name,
                'room_capacity' => (int) $room->capacity,
                'rooms_left' => $units,
                'price_per_night_fcfa' => (float) $quote['effective_price_per_night'],
                'total_fcfa' => (float) $quote['total'],
                'pay_in_full_fcfa' => (float) $options['options']['full']['amount'],
                'pay_in_full_discount_percent' => (float) $options['options']['full']['discount_percent'],
                'guarantee' => $guarantee
                    ? ['amount_fcfa' => (float) $guarantee['amount'], 'basis' => $guarantee['summary'], 'balance_at_arrival_fcfa' => (float) $guarantee['balance_at_hotel']]
                    : ['not_offered_because' => $options['reason']],
                'booking_link' => $link,
            ];
        }

        usort($offers, fn (array $x, array $y) => $x['total_fcfa'] <=> $y['total_fcfa']);

        return $offers;
    }

    /** Offre disponible la moins chère de l'établissement sur la période, ou null s'il est complet. */
    private function bestAvailableOffer(Accommodation $a, array $period, int $guests): ?array
    {
        return $this->availableOffers($a, $period, $guests)[0] ?? null;
    }

    private function getAccommodationDetails(int $id, array $input = []): string
    {
        $a = Accommodation::where('status', 'published')->find($id);
        if (!$a) {
            return json_encode(['error' => 'Établissement introuvable ou non publié.']);
        }

        $period = $this->stayPeriod($input);
        if (isset($period['error'])) {
            return json_encode($period);
        }
        $stay = [];
        if ($period !== null) {
            $offers = $this->availableOffers($a, $period, max(0, (int) ($input['guests'] ?? 0)));
            $stay = [
                'check_in' => $period['check_in'],
                'check_out' => $period['check_out'],
                'nights' => $period['nights'],
                'available' => $offers !== [],
                'available_rooms' => $offers,
            ];
        }

        return json_encode($stay + [
            'name' => $a->name,
            'type' => self::TYPE_LABELS[$a->type] ?? $a->type,
            'listing_link' => '/accommodations/' . $a->id,
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
            // Garantie de réservation paramétrée par l'établissement (libellé prêt à citer)
            'guarantee' => \App\Services\PaymentOptionsService::describeGuarantee($a)['description'],
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
