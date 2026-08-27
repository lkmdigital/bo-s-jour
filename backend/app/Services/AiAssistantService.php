<?php

namespace App\Services;

use Anthropic\Client;
use Anthropic\Messages\ToolUseBlock;
use App\Models\Setting;
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

        $apiKey = (string) Setting::get('anthropic_api_key', '') ?: config('services.anthropic.api_key', '');
        if ($apiKey) {
            $this->client = new Client(apiKey: $apiKey);
        }

        return $this->client;
    }

    public function isConfigured(): bool
    {
        return $this->getClient() !== null;
    }

    /**
     * @throws \RuntimeException si le module n'est pas configuré (clé API absente)
     */
    public function ask(string $question): string
    {
        $client = $this->getClient();
        if (!$client) {
            throw new \RuntimeException("Le module IA n'est pas configuré (clé API manquante).");
        }

        $model = config('services.anthropic.model', 'claude-opus-5');
        $tools = $this->toolDefinitions();

        $messages = [
            ['role' => 'user', 'content' => $question],
        ];

        $response = $client->messages->create(
            model: $model,
            maxTokens: 2000,
            system: $this->systemPrompt(),
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
                    $result = $this->safeExecuteTool($block->name, $block->input);
                    $toolResults[] = [
                        'type' => 'tool_result',
                        'toolUseID' => $block->id,
                        'content' => $result,
                    ];
                }
            }

            $messages[] = ['role' => 'assistant', 'content' => $response->content];
            $messages[] = ['role' => 'user', 'content' => $toolResults];

            $response = $client->messages->create(
                model: $model,
                maxTokens: 2000,
                system: $this->systemPrompt(),
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
            model: config('services.anthropic.model', 'claude-opus-5'),
            maxTokens: $maxTokens,
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
