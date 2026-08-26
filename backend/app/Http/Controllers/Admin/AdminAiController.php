<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminAiAssistantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Assistant IA Administrateur (doc client "MODULE IA BOSÉJOUR" §1.1). Voir
 * AdminAiAssistantService pour la logique — ce contrôleur ne fait que
 * valider l'entrée et traduire les erreurs en réponses HTTP propres.
 */
class AdminAiController extends Controller
{
    public function ask(Request $request, AdminAiAssistantService $assistant)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$assistant->isConfigured()) {
            return response()->json([
                'message' => "Le module IA n'est pas encore configuré (clé API manquante). Contactez un administrateur technique.",
            ], 503);
        }

        $data = $request->validate([
            'question' => 'required|string|min:3|max:500',
        ]);

        try {
            $answer = $assistant->ask($data['question']);
            return response()->json(['data' => ['answer' => $answer]]);
        } catch (\Throwable $e) {
            Log::error('Erreur assistant IA admin', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => "L'assistant IA n'a pas pu répondre pour le moment. Réessayez dans un instant.",
            ], 502);
        }
    }
}
