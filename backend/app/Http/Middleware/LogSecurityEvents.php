<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogSecurityEvents
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Logger les tentatives d'accès aux routes sensibles
        $sensitiveRoutes = ['/api/admin', '/api/payments', '/api/bookings'];
        $path = $request->path();
        
        foreach ($sensitiveRoutes as $route) {
            if (str_starts_with($path, $route)) {
                try {
                    Log::channel('security')->info('Sensitive route access', [
                        'ip' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'url' => $request->fullUrl(),
                        'method' => $request->method(),
                        'user_id' => $request->user()?->id,
                        'timestamp' => now()->toIso8601String(),
                    ]);
                } catch (\Throwable $e) {
                    // Ne pas faire échouer la requête si le fichier security.log n'est pas accessible (ex. permissions)
                }
                break;
            }
        }

        $response = $next($request);

        // Logger les erreurs d'authentification
        if ($response->getStatusCode() === 401 || $response->getStatusCode() === 403) {
            try {
                Log::channel('security')->warning('Authentication/Authorization failure', [
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                    'status_code' => $response->getStatusCode(),
                    'timestamp' => now()->toIso8601String(),
                ]);
            } catch (\Throwable $e) {
                // Ne pas faire échouer la réponse
            }
        }

        return $response;
    }
}

