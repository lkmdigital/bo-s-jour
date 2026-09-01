<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Limiter les méthodes autorisées
    // Origines autorisées : localhost pour le dev + domaines HTTPS de prod uniquement.
    // Surchargeable en prod via CORS_ALLOWED_ORIGINS (liste séparée par des virgules).
    // ⚠️ Ne jamais utiliser '*' avec supports_credentials = true.
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,https://bosejour.ci,https://www.bosejour.ci'))),
    'allowed_origins_patterns' => [
        '#^https://.*\.ngrok(-free)?\.(app|dev)$#', // Tunnels ngrok (dev via tunnel)
    ],
    // X-XSRF-TOKEN indispensable pour l'auth par cookie de session (Sanctum stateful,
    // migration 2026-08-31) : sans lui, le préflight CORS bloque toute requête mutante
    // depuis un vrai navigateur cross-origin (bosejour.ci -> api.bosejour.ci) — bug resté
    // caché jusqu'au 2026-09-01 (axios n'envoyait même pas cet en-tête avant, voir lib/api.ts
    // withXSRFToken ; une fois ce premier point corrigé, celui-ci est apparu à son tour).
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-XSRF-TOKEN', 'ngrok-skip-browser-warning'], // Limiter les headers autorisés
    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining'], // Exposer seulement les headers nécessaires
    'max_age' => 3600, // Cache les pré-requêtes CORS pendant 1 heure
    'supports_credentials' => true,
];

