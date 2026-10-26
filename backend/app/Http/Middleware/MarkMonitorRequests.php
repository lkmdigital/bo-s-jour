<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Reconnaît les requêtes du moniteur (en-tête secret X-Ops-Monitor) : pour elles seules, l'établissement de test
 * « synthétique » devient visible (voir Accommodation::booted). Sans le bon secret, rien ne change.
 */
class MarkMonitorRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('ops.monitor_secret');
        $given = (string) $request->header('X-Ops-Monitor', '');

        if ($secret !== '' && $given !== '' && hash_equals($secret, $given)) {
            app()->instance('ops.monitor', true);
        } else {
            app()->forgetInstance('ops.monitor');
        }

        return $next($request);
    }
}
