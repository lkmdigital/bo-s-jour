<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Réactivé le 2026-08-31 (migration localStorage -> cookie httpOnly, audit sécurité) :
        // sans ce middleware, un token Bearer stocké côté client (localStorage) était la seule
        // option — une faille XSS ailleurs sur le site suffisait à voler la session de façon
        // totale et persistante. Avec ce middleware actif, une requête provenant d'un domaine
        // listé dans SANCTUM_STATEFUL_DOMAINS s'authentifie via le cookie de session (httpOnly,
        // invisible au JS) + CSRF, au lieu d'un token lisible par script. Un appelant qui ne
        // correspond à aucun domaine stateful (ex. un futur client mobile) retombe
        // automatiquement sur l'authentification par token Bearer — les deux coexistent sans
        // conflit, c'est le mécanisme de résolution de garde natif de Sanctum.
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Middleware globaux de sécurité
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->append(\App\Http\Middleware\LogSecurityEvents::class);

        // Rate-limit global de l'API (240 req/min par utilisateur ou IP), en plus
        // des limites plus strictes déjà posées route par route (login, OTP, paiement…).
        // Une seule fiche établissement charge déjà 8-10 requêtes en parallèle
        // (établissement, chambres, avis, tarif, carte, favoris, suggestions…) ; à 120/min
        // quelques pages consultées à la suite suffisaient à déclencher "Too Many Attempts"
        // en usage normal, pas seulement en cas d'abus.
        //
        // Le préfixe "global-api" est indispensable : par défaut, la clé de compteur du
        // rate-limiter Laravel ne dépend QUE du domaine + de l'IP (pas du chemin de la
        // route, ni des valeurs maxAttempts/decay). Sans préfixe distinct ici, ce throttle
        // global partage exactement le même compteur que TOUS les throttle:N,1 posés route
        // par route ci-dessous — chaque requête, même une simple page consultée, incrémente
        // alors le même compteur que "tentatives de connexion" ou "tentatives de paiement",
        // qui se retrouvent bloquées après quelques pages de navigation normale, sans
        // rapport avec leur propre historique. C'était la cause du "Too Many Attempts"
        // qui apparaissait un peu partout sur le site.
        $middleware->api(append: [
            'throttle:240,1,global-api',
        ]);

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'hoststaff' => \App\Http\Middleware\EnsureHostStaffPermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // "Too Many Attempts." est un message codé en dur dans
        // Illuminate\Routing\Middleware\ThrottleRequests (pas une chaîne de validation
        // Laravel), donc lang/fr/validation.php ne le traduit pas. On le remplace ici pour
        // les requêtes API par un message français avec le délai d'attente réel.
        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, \Illuminate\Http\Request $request) {
            if (!$request->is('api/*') && !$request->expectsJson()) {
                return null;
            }
            $retryAfter = $e->getHeaders()['Retry-After'] ?? null;
            $message = $retryAfter
                ? "Trop de tentatives. Merci de réessayer dans {$retryAfter} seconde(s)."
                : 'Trop de tentatives. Merci de réessayer dans quelques instants.';
            return response()->json(['message' => $message], 429, $e->getHeaders());
        });
    })->create();

