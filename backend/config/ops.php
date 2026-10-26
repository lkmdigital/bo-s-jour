<?php

/**
 * Supervision boséjour (espace Ops) : adresses surveillées, comptes de test du moniteur et seuils.
 * Les identifiants des comptes de test et le secret du moniteur viennent de .env (jamais du dépôt).
 */
return [
    // Adresses réellement surveillées (la supervision passe par le même chemin que les visiteurs).
    'site_url' => rtrim(env('OPS_SITE_URL', 'https://bosejour.ci'), '/'),
    'api_url' => rtrim(env('OPS_API_URL', 'https://api.bosejour.ci'), '/'),

    // En-tête X-Ops-Monitor : reconnaît les requêtes du moniteur (établissement de test visible, etc.).
    'monitor_secret' => env('OPS_MONITOR_SECRET', ''),

    // Jeton de l'adresse de signal de vie interrogée par un service externe (UptimeRobot…).
    'heartbeat_token' => env('OPS_HEARTBEAT_TOKEN', ''),

    // Comptes synthétiques (créés par `php artisan ops:seed-synthetic`).
    'accounts' => [
        'traveler' => ['email' => env('OPS_TRAVELER_EMAIL', 'monitor-voyageur@monitor.bosejour.invalid'), 'password' => env('OPS_TRAVELER_PASSWORD', '')],
        'host' => ['email' => env('OPS_HOST_EMAIL', 'monitor-partenaire@monitor.bosejour.invalid'), 'password' => env('OPS_HOST_PASSWORD', '')],
        'admin' => ['email' => env('OPS_ADMIN_EMAIL', 'monitor-admin@monitor.bosejour.invalid'), 'password' => env('OPS_ADMIN_PASSWORD', '')],
    ],
    // Compte WhatsApp Business (WABA) de boséjour chez Meta : sert à lire l'état des modèles et du compte.
    'whatsapp_waba_id' => env('OPS_WHATSAPP_WABA_ID', '4153153764818499'),

    // Numéros factices : les messages WhatsApp/SMS vers ces préfixes sont ignorés (jamais envoyés).
    'synthetic_phone_prefix' => '2250000',

    'synthetic_accommodation_name' => 'Établissement de test (supervision)',

    // Parcours navigateur : Node.js et dossier où Playwright est installé (hors dépôt).
    'node_binary' => env('OPS_NODE_BINARY', 'node'),
    'playwright_path' => env('OPS_PLAYWRIGHT_PATH', '/var/www/monbeaupays-monitor/node_modules'),

    // Seuils.
    'ssl_warn_days' => 14,
    'ssl_fail_days' => 5,
    'disk_warn_percent' => 85,
    'disk_fail_percent' => 92,
    'backup_max_age_hours' => 26,
    'stuck_payment_minutes' => 30,
    'no_booking_hours' => 72,
    'log_window_minutes' => 30,
    'reminder_every_minutes' => 60,
    'max_whatsapp_alerts_per_hour' => 6,
    'result_retention_days' => 30,
];
