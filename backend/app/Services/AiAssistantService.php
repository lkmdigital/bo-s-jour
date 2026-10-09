<?php

namespace App\Services;

use Anthropic\Client;
use Anthropic\Messages\ToolUseBlock;
use Illuminate\Support\Facades\Log;

/**
 * Socle commun des assistants IA conversationnels du "MODULE IA BOSÉJOUR"
 * (admin §1.1, partenaire §2.1, …) : résolution de la clé/du client Anthropic
 * et boucle d'outils. Chaque persona fournit son propre prompt système et son
 * propre jeu d'outils fixes — jamais de requête SQL/Eloquent libre générée
 * par le modèle, uniquement un choix parmi des outils prédéfinis et
 * paramétrés (surface d'attaque nulle par design).
 */
abstract class AiAssistantService
{
    private ?Client $client = null;
    private bool $clientResolved = false;

    abstract protected function systemPrompt(): string;

    /** @return array<int, array<string, mixed>> */
    abstract protected function toolDefinitions(): array;

    abstract protected function executeTool(string $name, array $input): string;

    /**
     * Nom court utilisé dans les logs d'erreur pour distinguer les personas.
     */
    protected function logContext(): string
    {
        return static::class;
    }

    /**
     * Clé API : réglage admin (Paramètres > Réglages avancés > Intégrations,
     * modifiable sans toucher au code) en priorité, sinon repli sur
     * ANTHROPIC_API_KEY en .env. Résolu paresseusement (pas dans le
     * constructeur — le conteneur Laravel auto-résout tout paramètre de type
     * classe qu'il sait construire, même nullable à null par défaut, ce qui
     * masquerait silencieusement la détection "clé absente" si le client
     * était accepté en paramètre de constructeur).
     */
    protected function getClient(): ?Client
    {
        if ($this->clientResolved) {
            return $this->client;
        }
        $this->clientResolved = true;

        $apiKey = AiModule::apiKey();
        if ($apiKey) {
            $this->client = new Client(apiKey: $apiKey);
        }

        return $this->client;
    }

    public function isConfigured(): bool
    {
        return $this->getClient() !== null;
    }

    /** Nombre maximal de messages d'historique repris d'une conversation en cours. */
    public const MAX_HISTORY_MESSAGES = 10;

    /**
     * Jetons de sortie par appel. Sur les modèles récents la réflexion est toujours active
     * et compte dans ce plafond : une valeur trop basse couperait la réponse avant le texte.
     */
    private const MAX_TOKENS = 16000;

    /**
     * @param array<int, array{role: string, content: string}> $history échanges précédents de la
     *        même conversation (texte seul, déjà validé par l'appelant), du plus ancien au plus récent
     *
     * @throws \RuntimeException si le module n'est pas configuré (clé API absente)
     */
    public function ask(string $question, array $history = []): string
    {
        $client = $this->getClient();
        if (!$client) {
            throw new \RuntimeException("Le module IA n'est pas configuré (clé API manquante).");
        }

        $model = AiModule::model();
        $tools = $this->toolDefinitions();

        $messages = [];
        foreach (array_slice($history, -self::MAX_HISTORY_MESSAGES) as $turn) {
            $role = ($turn['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $text = trim((string) ($turn['content'] ?? ''));
            // La conversation doit commencer par un message de l'utilisateur.
            if ($text === '' || ($messages === [] && $role !== 'user')) {
                continue;
            }
            $messages[] = ['role' => $role, 'content' => $text];
        }
        $messages[] = ['role' => 'user', 'content' => $question];

        // $messages est capturé par référence : chaque appel envoie l'historique à jour.
        $create = function () use ($client, $model, $tools, &$messages) {
            return $client->messages->create(
                model: $model,
                maxTokens: self::MAX_TOKENS,
                system: $this->systemPrompt(),
                tools: $tools,
                messages: $messages,
            );
        };

        $response = $create();

        // Boucle bornée (6 itérations max) — évite un enchaînement incontrôlé et coûteux.
        // « tool_use » : nos outils à exécuter. « pause_turn » : un outil serveur d'Anthropic
        // (recherche web) n'a pas fini ; on renvoie le tour tel quel pour qu'il reprenne.
        $iterations = 0;
        while (in_array($response->stopReason, ['tool_use', 'pause_turn'], true) && $iterations < 6) {
            $iterations++;
            // Le contenu est renvoyé intact (blocs de réflexion compris), comme l'exige l'API.
            $messages[] = ['role' => 'assistant', 'content' => $response->content];

            if ($response->stopReason === 'tool_use') {
                $toolResults = [];
                foreach ($response->content as $block) {
                    if ($block instanceof ToolUseBlock) {
                        $toolResults[] = [
                            'type' => 'tool_result',
                            'toolUseID' => $block->id,
                            'content' => $this->safeExecuteTool($block->name, $block->input),
                        ];
                    }
                }
                $messages[] = ['role' => 'user', 'content' => $toolResults];
            }

            $response = $create();
        }

        if ($response->stopReason === 'refusal') {
            Log::warning("Refus du modèle {$this->logContext()}", ['category' => $response->stopDetails?->category]);

            return "Je ne peux pas répondre à cette demande. Reformulez votre question, ou contactez le support boséjour.";
        }

        $text = '';
        foreach ($response->content as $block) {
            if ($block->type === 'text') {
                $text .= $block->text;
            }
        }

        return trim($text) !== '' ? trim($text) : "Je n'ai pas pu formuler de réponse à cette question.";
    }

    private function safeExecuteTool(string $name, array $input): string
    {
        try {
            return $this->executeTool($name, $input);
        } catch (\Throwable $e) {
            Log::error("Erreur outil {$this->logContext()}", ['tool' => $name, 'input' => $input, 'error' => $e->getMessage()]);
            return json_encode(['error' => "Erreur lors de l'exécution de l'outil {$name}."]);
        }
    }

    /**
     * Appel simple sans boucle d'outils, pour les personas de génération de
     * contenu (description d'établissement, traduction, réponse à un avis…)
     * qui n'ont pas besoin d'interroger la plateforme — juste transformer un
     * texte fourni par l'appelant.
     *
     * @throws \RuntimeException si le module n'est pas configuré (clé API absente)
     */
    public function complete(string $systemPrompt, string $userPrompt, int $maxTokens = 1500): string
    {
        $client = $this->getClient();
        if (!$client) {
            throw new \RuntimeException("Le module IA n'est pas configuré (clé API manquante).");
        }

        $response = $client->messages->create(
            model: AiModule::model(),
            // La réflexion (toujours active sur les modèles récents) compte dans ce plafond :
            // on garde une marge au-dessus de la longueur de texte attendue.
            maxTokens: max($maxTokens, 8000),
            system: $systemPrompt,
            messages: [['role' => 'user', 'content' => $userPrompt]],
        );

        foreach ($response->content as $block) {
            if ($block->type === 'text') {
                return trim($block->text);
            }
        }

        return '';
    }
}
