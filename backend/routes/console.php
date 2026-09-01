<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Filet de sécurité webhook Malia Pay (voir App\Console\Commands\FlagStuckPendingPayments) —
// le webhook n'a aucune garantie de livraison ; ce digest quotidien est la seule visibilité
// sur les paiements "pending" qui pourraient être passés inaperçus autrement.
// ⚠️ Ne fonctionne QUE si le cron du serveur exécute `php artisan schedule:run` chaque
// minute (crontab standard Laravel) — à vérifier/ajouter sur le VPS, voir le commentaire
// de FlagStuckPendingPayments et la doc de déploiement.
Schedule::command('payments:flag-stuck-pending')->dailyAt('08:00');

