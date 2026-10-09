<?php

namespace App\Http\Controllers;

use App\Services\AiModule;
use App\Services\TravelerAiAssistantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Assistant IA Voyageur (doc client "MODULE IA BOSÉJOUR" §3). Voir
 * TravelerAiAssistantService pour la logique.
 */
class TravelerAiController extends Controller
{
    /** Espace membre : voyageur connecté (route protégée). */
    public function ask(Request $request)
    {
        return $this->answer($request, new TravelerAiAssistantService($request->user()), $request->user()->id);
    }

    /**
     * Bulle flottante des pages publiques. Un voyageur connecté y retrouve tous ses outils ;
     * tout autre visiteur (non connecté, ou compte partenaire/admin) n'a que les outils publics.
     * Les visiteurs non connectés sont plafonnés : chaque question est facturée par Anthropic.
     */
    public function askPublic(Request $request)
    {
        $user = $request->user('sanctum');
        $traveler = $user && $user->isUser() ? $user : null;

        if (!$traveler) {
            if (!AiModule::guestsAllowed()) {
                return response()->json([
                    'message' => "Connectez-vous à votre espace voyageur pour discuter avec l'assistant.",
                    'login_required' => true,
                ], 401);
            }

            $secondsUntilMidnight = max(60, now()->diffInSeconds(now()->endOfDay()));
            $ipKey = 'ai-guest-ip:' . sha1((string) $request->ip()) . ':' . now()->toDateString();
            $allKey = 'ai-guest-all:' . now()->toDateString();

            // Plafond global à 0 = aucun visiteur non connecté (tooManyAttempts ne bloque qu'après un premier passage).
            if (AiModule::guestDailyLimit() <= 0
                || RateLimiter::tooManyAttempts($ipKey, AiModule::GUEST_DAILY_LIMIT_PER_IP)
                || RateLimiter::tooManyAttempts($allKey, AiModule::guestDailyLimit())) {
                return response()->json([
                    'message' => "L'assistant a atteint sa limite d'utilisation pour aujourd'hui. Connectez-vous à votre espace voyageur pour continuer, ou revenez demain.",
                    'login_required' => true,
                ], 429);
            }
            RateLimiter::hit($ipKey, $secondsUntilMidnight);
            RateLimiter::hit($allKey, $secondsUntilMidnight);
        }

        return $this->answer($request, new TravelerAiAssistantService($traveler), $traveler?->id);
    }

    private function answer(Request $request, TravelerAiAssistantService $assistant, ?int $userId)
    {
        if (!$assistant->isConfigured()) {
            return response()->json([
                'message' => "Le module IA n'est pas encore configuré. Réessayez plus tard.",
            ], 503);
        }

        $data = $request->validate([
            'question' => 'required|string|min:3|max:500',
            // Échanges précédents de la conversation en cours (bulle de discussion)
            'history' => 'sometimes|array|max:' . TravelerAiAssistantService::MAX_HISTORY_MESSAGES,
            'history.*.role' => 'required_with:history|string|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:4000',
        ]);

        try {
            $answer = $assistant->ask($data['question'], $data['history'] ?? []);

            // `offers` : établissements trouvés, affichés en cartes sous la réponse.
            return response()->json(['data' => ['answer' => $answer, 'offers' => $assistant->lastOffers()]]);
        } catch (\Throwable $e) {
            Log::error('Erreur assistant IA voyageur', ['user_id' => $userId, 'error' => $e->getMessage()]);

            return response()->json([
                'message' => "L'assistant IA n'a pas pu répondre pour le moment. Réessayez dans un instant.",
            ], 502);
        }
    }
}
