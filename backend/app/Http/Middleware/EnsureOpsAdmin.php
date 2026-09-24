<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Accès à l'espace interne "Ops" (Blade, /ops) : réservé aux administrateurs,
 * via le guard de session "web" (indépendant de l'auth Sanctum de l'API/du
 * site public). Une requête non authentifiée ou non admin est redirigée vers
 * la page de connexion Ops plutôt que de recevoir une réponse JSON.
 */
class EnsureOpsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth('web')->user();

        if (!$user || !$user->isAdmin()) {
            auth('web')->logout();
            return redirect()->route('ops.login')->with('ops_error', $user ? "Accès réservé aux administrateurs." : null);
        }

        return $next($request);
    }
}
