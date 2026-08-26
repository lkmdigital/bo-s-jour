<?php

namespace App\Services;

use Anthropic\Client;
use Anthropic\Messages\ToolUseBlock;
use App\Models\Accommodation;
use App\Models\Booking;
use Illuminate\Support\Facades\Log;

/**
 * Assistant IA Administrateur (doc client "MODULE IA BOSÉJOUR" §1.1 —
 * "Assistant Conversationnel" : l'administrateur interroge la plateforme en
 * langage naturel). V1 volontairement restreinte aux 4 questions données en
 * exemple dans le doc — chacune un outil séparé, aucune requête SQL libre
 * générée par le modèle (surface d'attaque nulle : Claude ne choisit que
 * PARMI des requêtes Eloquent fixes et paramétrées, jamais leur contenu SQL).
 *
 * Rapports automatiques, détection d'anomalies/fraude, contrôle de conformité
 * IA (§1.3 à §1.8 du doc) : hors périmètre de cette V1, à construire ensuite.
 */
class AdminAiAssistantService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
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
PROMPT;

    private ?Client $client = null;

    public function __construct()
    {
        // Pas de paramètre `?Client` dans le constructeur : le conteneur Laravel
        // auto-résout tout paramètre de type classe qu'il sait construire, même
        // nullable avec valeur par défaut à null — masquant silencieusement la
        // vérification "clé API absente" ci-dessous (bug trouvé en vérification).
        $apiKey = config('services.anthropic.api_key');
        if ($apiKey) {
            $this->client = new Client(apiKey: $apiKey);
        }
    }

    public function isConfigured(): bool
    {
        return $this->client !== null;
    }

    /**
     * @throws \RuntimeException si le module n'est pas configuré (clé API absente)
     */
    public function ask(string $question): string
    {
        if (!$this->client) {
            throw new \RuntimeException("Le module IA n'est pas configuré (clé API manquante).");
        }

        $model = config('services.anthropic.model', 'claude-opus-5');
        $tools = $this->toolDefinitions();

        $messages = [
            ['role' => 'user', 'content' => $question],
        ];

        $response = $this->client->messages->create(
            model: $model,
            maxTokens: 2000,
            system: self::SYSTEM_PROMPT,
            tools: $tools,
            messages: $messages,
        );

        // Boucle d'outils bornée (6 itérations max) — évite un enchaînement
        // incontrôlé et coûteux si le modèle boucle sur un appel d'outil.
        $iterations = 0;
        while ($response->stopReason === 'tool_use' && $iterations < 6) {
            $iterations++;
            $toolResults = [];

            foreach ($response->content as $block) {
                if ($block instanceof ToolUseBlock) {
                    $result = $this->executeTool($block->name, $block->input);
                    $toolResults[] = [
                        'type' => 'tool_result',
                        'toolUseID' => $block->id,
                        'content' => $result,
                    ];
                }
            }

            $messages[] = ['role' => 'assistant', 'content' => $response->content];
            $messages[] = ['role' => 'user', 'content' => $toolResults];

            $response = $this->client->messages->create(
                model: $model,
                maxTokens: 2000,
                system: self::SYSTEM_PROMPT,
                tools: $tools,
                messages: $messages,
            );
        }

        foreach ($response->content as $block) {
            if ($block->type === 'text') {
                return $block->text;
            }
        }

        return "Je n'ai pas pu formuler de réponse à cette question.";
    }

    private function toolDefinitions(): array
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
        ];
    }

    private function executeTool(string $name, array $input): string
    {
        try {
            return match ($name) {
                'get_pending_establishments' => $this->getPendingEstablishments(),
                'count_bookings' => $this->countBookings((int) ($input['days'] ?? 7)),
                'get_inactive_establishments' => $this->getInactiveEstablishments((int) ($input['days'] ?? 90)),
                'get_revenue_by_city' => $this->getRevenueByCity(),
                default => json_encode(['error' => "Outil inconnu : {$name}"]),
            };
        } catch (\Throwable $e) {
            Log::error('Erreur outil assistant IA admin', ['tool' => $name, 'input' => $input, 'error' => $e->getMessage()]);
            return json_encode(['error' => "Erreur lors de l'exécution de l'outil {$name}."]);
        }
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
}
