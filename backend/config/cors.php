<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Limiter les méthodes autorisées
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://72.62.16.236,http://72.62.31.145,http://bosejour.ci,https://bosejour.ci,https://monbeaupays.com,https://www.monbeaupays.com,https://monbeaupays.loyerpay.ci,http://monbeaupays.loyerpay.ci'))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'], // Limiter les headers autorisés
    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining'], // Exposer seulement les headers nécessaires
    'max_age' => 3600, // Cache les pré-requêtes CORS pendant 1 heure
    'supports_credentials' => true,
];

