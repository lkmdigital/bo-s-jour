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
// Réconciliation rapide (sans e-mail) : un paiement réussi chez MaliaPay dont le webhook
// n'est pas arrivé apparaît dans les tableaux de bord en quelques minutes, pas le lendemain.
Schedule::command('payments:flag-stuck-pending --minutes=3 --no-digest')->everyFiveMinutes()->withoutOverlapping();

// Sauvegarde quotidienne de la base de données (audit de sécurité externe, 2026-09-27,
// Phase 6) : jusqu'ici, seuls des instantanés des fichiers applicatifs existaient avant
// chaque déploiement (voir deploy.sh), jamais la base elle-même. Nécessite mysqldump sur
// le serveur (paquet mysql-client / mariadb-client) ; échoue silencieusement (au sens : ne
// bloque rien d'autre) si absent, voir les logs. Écrit dans storage/app/backups/database,
// jamais sur le disque public.
Schedule::command('backup:database')->dailyAt('03:00')->withoutOverlapping();


// ── Supervision (espace Ops) ────────────────────────────────────────────────────────────────
// Chaque minute : exécute les contrôles arrivés à échéance (site, API, parcours API des trois
// profils, serveur, journaux, anomalies métier) et laisse le « signal de vie » à jour.
Schedule::command('ops:monitor')->everyMinute()->withoutOverlapping(10)->runInBackground();
// Parcours navigateur (voyageur de bout en bout, partenaire, admin), décalés pour ne jamais se chevaucher.
Schedule::command('ops:browser-journeys traveler')->cron('*/15 * * * *')->withoutOverlapping(20)->runInBackground();
Schedule::command('ops:browser-journeys host')->cron('5,35 * * * *')->withoutOverlapping(20)->runInBackground();
Schedule::command('ops:browser-journeys admin')->cron('20,50 * * * *')->withoutOverlapping(20)->runInBackground();
// Supprime les réservations de test oubliées et purge les anciens résultats.
Schedule::command('ops:cleanup-synthetic')->everyFiveMinutes()->withoutOverlapping();
// Résumé quotidien (8 h) ; le lundi il devient un bilan de la semaine.
Schedule::command('ops:digest')->dailyAt('08:00')->timezone('Africa/Abidjan');

// ── File d'attente ──────────────────────────────────────────────────────────────────────────
// Aucun processus permanent ne traitait la file (QUEUE_CONNECTION=database) : e-mails de réservation et
// notifications de fidélité restaient en attente indéfiniment (39 tâches bloquées depuis le 2026-09-01).
// Le planificateur (cron chaque minute) traite désormais la file, puis s'arrête dès qu'elle est vide.
Schedule::command('queue:work --queue=notifications,default --stop-when-empty --max-time=50 --tries=3 --sleep=1')
    ->everyMinute()
    ->withoutOverlapping(5)
    ->runInBackground();
