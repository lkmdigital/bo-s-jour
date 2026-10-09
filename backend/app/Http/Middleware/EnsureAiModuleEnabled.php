<?php

namespace App\Http\Middleware;

use App\Services\AiModule;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ferme toutes les routes IA tant que l'admin n'a pas activé le module
 * (Paramètres > Réglages avancés). Réponse 404 : le module est alors
 * indiscernable d'une fonctionnalité inexistante.
 */
class EnsureAiModuleEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!AiModule::enabled()) {
            return response()->json(['message' => "L'assistant IA n'est pas activé."], 404);
        }

        return $next($request);
    }
}
