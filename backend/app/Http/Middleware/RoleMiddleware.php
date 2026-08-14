<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (!auth()->check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = auth()->user();

        if ($role === 'admin' && !$user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($role === 'host' && !$user->isHost() && !$user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Collaborateur (réceptionniste, comptabilité...) suspendu par le propriétaire :
        // coupure d'accès immédiate, même si le token reste valide (brief Extranet
        // Partenaire, Phase 13 — menu Personnel).
        if ($user->isStaff()) {
            $suspended = \App\Models\HostStaff::where('collaborator_user_id', $user->id)
                ->where('owner_id', $user->staff_owner_id)
                ->where('status', \App\Models\HostStaff::STATUS_SUSPENDED)
                ->exists();
            if ($suspended) {
                return response()->json(['message' => 'Votre accès a été suspendu par le propriétaire du compte.'], 403);
            }
        }

        return $next($request);
    }
}

