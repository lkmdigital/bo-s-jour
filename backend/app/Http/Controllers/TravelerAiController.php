<?php

namespace App\Http\Controllers;

use App\Services\TravelerAiAssistantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Assistant IA Voyageur (doc client "MODULE IA BOSÉJOUR" §3). Voir
 * TravelerAiAssistantService pour la logique.
 */
class TravelerAiController extends Controller
{
    public function ask(Request $request)
    {
        $traveler = $request->user();

        $assistant = new TravelerAiAssistantService($traveler);

        if (!$assistant->isConfigured()) {
            return response()->json([
                'message' => "Le module IA n'est pas encore configuré. Réessayez plus tard.",
            ], 503);
        }

        $data = $request->validate([
            'question' => 'required|string|min:3|max:500',
        ]);

        try {
            $answer = $assistant->ask($data['question']);
            return response()->json(['data' => ['answer' => $answer]]);
        } catch (\Throwable $e) {
            Log::error('Erreur assistant IA voyageur', ['user_id' => $traveler->id, 'error' => $e->getMessage()]);
            return response()->json([
                'message' => "L'assistant IA n'a pas pu répondre pour le moment. Réessayez dans un instant.",
            ], 502);
        }
    }
}
