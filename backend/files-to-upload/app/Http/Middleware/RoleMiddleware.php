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

        return $next($request);
    }
}

