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
        // Removed EnsureFrontendRequestsAreStateful for API-only mode with Bearer tokens
        // If you need stateful authentication, uncomment the line below and configure CORS/CSRF properly
        // $middleware->api(prepend: [
        //     \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        // ]);

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
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

