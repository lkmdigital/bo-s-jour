<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Services\HostAiAssistantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Assistant IA Partenaire (doc client "MODULE IA BOSÉJOUR" §2.1). Voir
 * HostAiAssistantService pour la logique — ce contrôleur ne fait que
 * valider l'entrée et scoper l'assistant à l'hôte authentifié.
 */
class HostAiController extends Controller
{
    public function ask(Request $request)
    {
        $host = $request->user();
        if (!$host || !$host->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $assistant = new HostAiAssistantService($host);

        if (!$assistant->isConfigured()) {
            return response()->json([
                'message' => "Le module IA n'est pas encore configuré. Contactez l'équipe bo séjour.",
            ], 503);
        }

        $data = $request->validate([
            'question' => 'required|string|min:3|max:500',
        ]);

        try {
            $answer = $assistant->ask($data['question']);
            return response()->json(['data' => ['answer' => $answer]]);
        } catch (\Throwable $e) {
            Log::error('Erreur assistant IA partenaire', ['host_id' => $host->hostScopeId(), 'error' => $e->getMessage()]);
            return response()->json([
                'message' => "L'assistant IA n'a pas pu répondre pour le moment. Réessayez dans un instant.",
            ], 502);
        }
    }
}
