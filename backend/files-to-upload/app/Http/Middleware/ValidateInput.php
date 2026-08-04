<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class ValidateInput
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Sanitize les inputs pour prévenir les attaques XSS
        $input = $request->all();
        
        array_walk_recursive($input, function (&$value) {
            if (is_string($value)) {
                // Échapper les caractères HTML mais garder les données valides
                $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
        });

        // Remplacer les inputs sanitized
        $request->merge($input);

        return $next($request);
    }
}

