<?php

namespace App\Services\Ops\Monitor;

use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Liste de tous les contrôles automatiques de la supervision : plateforme (site, API, recherche,
 * fiche, prix), serveur (certificats, disque, sauvegarde, files), journaux d'erreurs, anomalies
 * métier et parcours API des trois profils. Les parcours navigateur sont enregistrés à part
 * (commande ops:browser-journeys) mais déclarés ici pour apparaître dans le tableau de bord.
 */
class CheckRegistry
{
    public function __construct(
        private MonitorHttp $http = new MonitorHttp(),
        private ?LogErrorScanner $logs = null,
    ) {
        $this->logs ??= new LogErrorScanner();
    }

    /** @return array<string,MonitorCheck> indexés par clé */
    public function all(): array
    {
        $checks = [
            // ── Plateforme visible des visiteurs ───────────────────────────────────────────
            new MonitorCheck('site.up', 'Site web en ligne', 'system', 'api', 'critical', 1, 2, fn () => $this->siteUp()),
            new MonitorCheck('api.up', 'API en ligne', 'system', 'api', 'critical', 1, 2, fn () => $this->apiUp()),
            new MonitorCheck('public.search', 'Recherche d\'hébergements', 'traveler', 'api', 'critical', 5, 2, fn () => $this->search()),
            new MonitorCheck('public.listing', 'Fiche, chambres et calcul du prix', 'traveler', 'api', 'critical', 5, 2, fn () => $this->listing()),
            new MonitorCheck('public.cities', 'Villes populaires', 'traveler', 'api', 'minor', 10, 3, fn () => $this->cities()),
            new MonitorCheck('business.verification_flag', 'Vérification du numéro cohérente avec WhatsApp', 'traveler', 'business', 'critical', 5, 1, fn () => $this->verificationFlag()),

            // ── Parcours API des trois profils ──────────────────────────────────────────────
            new MonitorCheck('journey.traveler', 'Espace voyageur (connexion + écrans)', 'traveler', 'api', 'critical', 5, 2, fn () => (new ApiJourney($this->http))->run('traveler')),
            new MonitorCheck('journey.host', 'Espace partenaire (connexion + écrans)', 'host', 'api', 'critical', 5, 2, fn () => (new ApiJourney($this->http))->run('host')),
            new MonitorCheck('journey.admin', 'Espace administrateur (connexion + écrans)', 'admin', 'api', 'critical', 5, 2, fn () => (new ApiJourney($this->http))->run('admin')),

            // ── Serveur ─────────────────────────────────────────────────────────────────────
            new MonitorCheck('server.tls', 'Certificats HTTPS', 'system', 'api', 'major', 360, 1, fn () => $this->tls()),
            new MonitorCheck('server.disk', 'Espace disque', 'system', 'api', 'major', 10, 1, fn () => $this->disk()),
            new MonitorCheck('server.backup', 'Sauvegarde quotidienne de la base', 'system', 'api', 'major', 60, 1, fn () => $this->backup()),
            new MonitorCheck('server.queue', 'Tâches en file d\'attente', 'system', 'api', 'major', 10, 2, fn () => $this->queue()),

            // ── Journaux d'erreurs ──────────────────────────────────────────────────────────
            new MonitorCheck('logs.errors', 'Erreurs applicatives (journal)', 'system', 'logs', 'major', 5, 2, fn () => $this->logErrors()),
            new MonitorCheck('logs.sms', 'Envoi de SMS', 'system', 'logs', 'major', 10, 1, fn () => $this->logCategory('sms', 'Les SMS échouent (solde ou configuration SMS.to ?)', ['ERROR'])),
            new MonitorCheck('logs.whatsapp', 'Envoi de messages WhatsApp', 'system', 'logs', 'major', 10, 1, fn () => $this->logCategory('whatsapp', 'Des messages WhatsApp échouent', ['ERROR', 'WARNING'], 'WhatsApp send failed|WhatsApp template send|Webhook WhatsApp')),
            new MonitorCheck('logs.ai', 'Assistant Bo', 'system', 'logs', 'major', 10, 1, fn () => $this->logCategory('ai', 'L\'assistant Bo renvoie des erreurs', ['ERROR'])),
            new MonitorCheck('logs.payments', 'Erreurs de paiement', 'system', 'logs', 'critical', 5, 1, fn () => $this->logCategory('payment', 'Erreurs dans les paiements', ['ERROR', 'CRITICAL'])),

            // ── Anomalies métier ────────────────────────────────────────────────────────────
            new MonitorCheck('business.payments_stuck', 'Paiements bloqués en attente', 'system', 'business', 'major', 10, 1, fn () => $this->stuckPayments()),
            new MonitorCheck('business.requests_expired', 'Demandes d\'hôte non expirées à temps', 'system', 'business', 'major', 15, 1, fn () => $this->expiredRequests()),
            new MonitorCheck('business.no_bookings', 'Activité de réservation', 'system', 'business', 'minor', 60, 1, fn () => $this->noBookings()),
            new MonitorCheck('business.whatsapp', 'Compte WhatsApp (état chez Meta)', 'system', 'business', 'major', 60, 1, fn () => $this->whatsappHealth()),
            new MonitorCheck('business.ai', 'Assistant Bo (test réel)', 'system', 'business', 'major', 360, 1, fn () => $this->aiProbe()),

            // ── Parcours navigateur (résultats enregistrés par ops:browser-journeys) ────────
            new MonitorCheck('browser.traveler', 'Parcours voyageur complet (navigateur)', 'traveler', 'browser', 'critical', 15, 2, fn () => CheckResult::ok()),
            new MonitorCheck('browser.host', 'Parcours partenaire (navigateur)', 'host', 'browser', 'critical', 30, 2, fn () => CheckResult::ok()),
            new MonitorCheck('browser.admin', 'Parcours administrateur (navigateur)', 'admin', 'browser', 'major', 30, 2, fn () => CheckResult::ok()),
        ];

        $indexed = [];
        foreach ($checks as $check) {
            $indexed[$check->key] = $check;
        }

        return $indexed;
    }

    /** Contrôles exécutés par le planificateur (les parcours navigateur ont leur propre commande). */
    public function runnable(): array
    {
        return array_filter($this->all(), fn (MonitorCheck $c) => $c->kind !== 'browser');
    }

    // ── Plateforme ──────────────────────────────────────────────────────────────────────────

    private function siteUp(): CheckResult
    {
        $res = $this->http->get($this->http->site('/'), [], null, 15);
        if ($res->status() !== 200) {
            return CheckResult::fail('Le site répond HTTP ' . $res->status() . ' au lieu de 200.');
        }
        if (!str_contains(mb_strtolower($res->body()), 'boséjour')) {
            return CheckResult::fail('La page d\'accueil répond 200 mais son contenu est inattendu (titre « boséjour » absent).');
        }

        return $this->slowOrOk($res->handlerStats()['total_time'] ?? 0, 'Accueil OK');
    }

    private function apiUp(): CheckResult
    {
        $res = $this->http->get($this->http->api('/settings/public'));
        if (!$res->successful() || $res->json('app_name') === null) {
            return CheckResult::fail('L\'API publique répond HTTP ' . $res->status() . ' (réglages publics illisibles).');
        }

        return $this->slowOrOk($res->handlerStats()['total_time'] ?? 0, 'API OK');
    }

    private function slowOrOk(float $seconds, string $okMessage): CheckResult
    {
        return $seconds > 4
            ? CheckResult::warn(sprintf('Réponse lente : %.1f s.', $seconds), ['secondes' => round($seconds, 2)])
            : CheckResult::ok($okMessage, ['secondes' => round($seconds, 2)]);
    }

    private function search(): CheckResult
    {
        $res = $this->http->get($this->http->api('/accommodations'), ['per_page' => 3]);
        if (!$res->successful() || !is_array($res->json('data'))) {
            return CheckResult::fail('La recherche d\'hébergements répond HTTP ' . $res->status() . '.');
        }
        if (count($res->json('data')) === 0) {
            return CheckResult::warn('La recherche ne renvoie aucun établissement publié.');
        }

        return CheckResult::ok(count($res->json('data')) . ' établissement(s) renvoyé(s)');
    }

    private function listing(): CheckResult
    {
        $search = $this->http->get($this->http->api('/accommodations'), ['per_page' => 1]);
        $id = $search->json('data.0.id');
        if (!$id) {
            return CheckResult::warn('Aucun établissement publié à contrôler.');
        }

        $detail = $this->http->get($this->http->api("/accommodations/$id"));
        if (!$detail->successful() || !$detail->json('name')) {
            return CheckResult::fail("La fiche de l'établissement #$id répond HTTP " . $detail->status() . '.');
        }
        $rooms = $this->http->get($this->http->api("/accommodations/$id/rooms"));
        if (!$rooms->successful()) {
            return CheckResult::fail("Les chambres de l'établissement #$id répondent HTTP " . $rooms->status() . '.');
        }
        $unavailable = $this->http->get($this->http->api("/accommodations/$id/unavailable-dates"));
        if (!$unavailable->successful()) {
            return CheckResult::fail("Le calendrier de l'établissement #$id répond HTTP " . $unavailable->status() . '.');
        }

        $roomId = $rooms->json('data.0.id') ?? $rooms->json('0.id');
        $query = ['check_in' => now()->addDays(45)->toDateString(), 'check_out' => now()->addDays(47)->toDateString()];
        if ($roomId) {
            $query['room_id'] = $roomId;
        }
        $price = $this->http->get($this->http->api("/accommodations/$id/price-preview"), $query);
        if (!$price->successful() || !is_numeric($price->json('total')) || (float) $price->json('total') <= 0) {
            return CheckResult::fail("Le calcul du prix de l'établissement #$id est en erreur (HTTP " . $price->status() . ').', ['réponse' => mb_substr($price->body(), 0, 300)]);
        }

        return CheckResult::ok("Fiche, chambres, calendrier et prix OK (établissement #$id)", ['total_2_nuits' => $price->json('total')]);
    }

    private function cities(): CheckResult
    {
        $res = $this->http->get($this->http->api('/accommodations/top-cities'));

        return $res->successful() ? CheckResult::ok() : CheckResult::fail('Villes populaires : HTTP ' . $res->status() . '.');
    }

    /**
     * Incident du 2026-10-16 : activer WhatsApp rendait la vérification du numéro obligatoire alors que le modèle
     * d'authentification n'existait pas chez Meta → plus aucune réservation possible. On détecte la combinaison.
     */
    private function verificationFlag(): CheckResult
    {
        $res = $this->http->get($this->http->api('/settings/public'));
        if (!$res->successful()) {
            return CheckResult::warn('Réglages publics illisibles (HTTP ' . $res->status() . ').');
        }
        if (!$res->json('whatsapp_verification_enabled')) {
            return CheckResult::ok('Vérification du numéro par WhatsApp désactivée : réservation libre');
        }

        $approved = $this->whatsappTemplateStatus('bosejour_code_verification');
        if ($approved === 'APPROVED') {
            return CheckResult::ok('Vérification du numéro active, modèle d\'authentification approuvé');
        }

        return CheckResult::fail('La vérification du numéro est OBLIGATOIRE à la réservation mais le modèle WhatsApp « code de vérification » n\'est pas approuvé (' . ($approved ?? 'introuvable') . ') : les voyageurs ne peuvent plus réserver.');
    }

    // ── Serveur ─────────────────────────────────────────────────────────────────────────────

    private function tls(): CheckResult
    {
        $worst = null;
        $details = [];
        foreach ([parse_url(config('ops.site_url'), PHP_URL_HOST), parse_url(config('ops.api_url'), PHP_URL_HOST)] as $host) {
            $days = $host ? $this->certificateDaysLeft($host) : null;
            if ($days === null) {
                return CheckResult::fail("Certificat HTTPS illisible pour $host.");
            }
            $details[$host] = $days;
            $worst = $worst === null ? $days : min($worst, $days);
        }
        if ($worst <= (int) config('ops.ssl_fail_days')) {
            return CheckResult::fail("Un certificat HTTPS expire dans $worst jour(s).", $details);
        }
        if ($worst <= (int) config('ops.ssl_warn_days')) {
            return CheckResult::warn("Un certificat HTTPS expire dans $worst jours.", $details);
        }

        return CheckResult::ok("Certificats valides encore $worst jours au minimum", $details);
    }

    protected function certificateDaysLeft(string $host): ?int
    {
        $context = stream_context_create(['ssl' => ['capture_peer_cert' => true, 'verify_peer' => false, 'SNI_enabled' => true, 'peer_name' => $host]]);
        $socket = @stream_socket_client("ssl://$host:443", $errno, $error, 10, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            return null;
        }
        $cert = openssl_x509_parse(stream_context_get_params($socket)['options']['ssl']['peer_certificate'] ?? '');
        fclose($socket);

        return isset($cert['validTo_time_t']) ? (int) floor(($cert['validTo_time_t'] - time()) / 86400) : null;
    }

    private function disk(): CheckResult
    {
        $free = @disk_free_space(base_path());
        $total = @disk_total_space(base_path());
        if (!$free || !$total) {
            return CheckResult::warn('Espace disque illisible.');
        }
        $used = round((1 - $free / $total) * 100, 1);
        $details = ['utilisé_%' => $used, 'libre_go' => round($free / 1_073_741_824, 1)];
        if ($used >= (int) config('ops.disk_fail_percent')) {
            return CheckResult::fail("Disque presque plein : $used % utilisé.", $details);
        }
        if ($used >= (int) config('ops.disk_warn_percent')) {
            return CheckResult::warn("Disque rempli à $used %.", $details);
        }

        return CheckResult::ok("Disque utilisé à $used %", $details);
    }

    private function backup(): CheckResult
    {
        $files = glob(storage_path('app/backups/database/*')) ?: [];
        if (!$files) {
            return CheckResult::fail('Aucune sauvegarde de la base trouvée.');
        }
        $newest = max(array_map('filemtime', $files));
        $hours = round((time() - $newest) / 3600, 1);
        if ($hours > (int) config('ops.backup_max_age_hours')) {
            return CheckResult::fail("La dernière sauvegarde de la base date de $hours h.", ['heures' => $hours]);
        }

        return CheckResult::ok("Dernière sauvegarde il y a $hours h", ['heures' => $hours]);
    }

    private function queue(): CheckResult
    {
        $failed = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->where('failed_at', '>=', now()->subHour())->count() : 0;
        $stale = Schema::hasTable('jobs') ? DB::table('jobs')->where('available_at', '<', now()->subMinutes(10)->timestamp)->count() : 0;
        $details = ['échoués_1h' => $failed, 'en_retard_10min' => $stale];
        if ($failed >= 5 || $stale >= 20) {
            return CheckResult::fail("File d'attente en difficulté : $failed tâche(s) échouée(s), $stale en retard.", $details);
        }
        if ($failed > 0 || $stale > 0) {
            return CheckResult::warn("File d'attente : $failed échouée(s), $stale en retard.", $details);
        }

        return CheckResult::ok('Aucune tâche en échec ni en retard', $details);
    }

    // ── Journaux ────────────────────────────────────────────────────────────────────────────

    private function logErrors(): CheckResult
    {
        $window = (int) config('ops.log_window_minutes');
        // Les familles qui ont leur propre contrôle (SMS, WhatsApp, Bo, paiements) ne sont pas comptées deux fois.
        $groups = array_values(array_filter($this->logs->scan($window), fn ($g) => !in_array($g['category'], ['sms', 'whatsapp', 'ai', 'payment'], true)));
        $total = array_sum(array_column($groups, 'count'));
        $top = array_slice($groups, 0, 5);
        $summary = collect($top)->map(fn ($g) => $g['count'] . '× ' . $g['signature'])->implode(' | ');
        $details = ['fenêtre_min' => $window, 'total' => $total, 'principales' => $top];
        if ($total >= 30) {
            return CheckResult::fail("$total erreurs en $window min : $summary", $details);
        }
        if ($total >= 5) {
            return CheckResult::warn("$total erreurs en $window min : $summary", $details);
        }

        return CheckResult::ok($total === 0 ? "Aucune erreur en $window min" : "$total erreur(s) isolée(s) en $window min", $details);
    }

    private function logCategory(string $category, string $problem, array $levels, ?string $messageRegex = null): CheckResult
    {
        $window = (int) config('ops.log_window_minutes');
        $groups = array_values(array_filter(
            $this->logs->scan($window, $levels),
            fn ($g) => $g['category'] === $category && ($messageRegex === null || preg_match('/' . $messageRegex . '/i', $g['sample']))
        ));
        $total = array_sum(array_column($groups, 'count'));
        $threshold = $category === 'payment' ? 1 : 3;
        if ($total >= $threshold) {
            $top = $groups[0]['signature'] ?? '';

            return CheckResult::fail("$problem ($total en $window min) : $top", ['fenêtre_min' => $window, 'total' => $total, 'groupes' => array_slice($groups, 0, 3)]);
        }

        return CheckResult::ok($total === 0 ? 'Aucune erreur' : "$total erreur isolée", ['total' => $total]);
    }

    // ── Anomalies métier ────────────────────────────────────────────────────────────────────

    private function realUsers($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('users.is_synthetic')->orWhere('users.is_synthetic', false);
        });
    }

    private function stuckPayments(): CheckResult
    {
        $minutes = (int) config('ops.stuck_payment_minutes');
        $query = DB::table('payments')->leftJoin('users', 'users.id', '=', 'payments.user_id')
            ->where('payments.status', 'pending')
            ->where('payments.created_at', '<', now()->subMinutes($minutes))
            ->where('payments.created_at', '>', now()->subDays(7));
        $count = $this->realUsers($query)->count();

        return $count > 0
            ? CheckResult::fail("$count paiement(s) bloqué(s) « en attente » depuis plus de $minutes min.", ['paiements' => $count])
            : CheckResult::ok('Aucun paiement bloqué');
    }

    private function expiredRequests(): CheckResult
    {
        $query = DB::table('bookings')->leftJoin('users', 'users.id', '=', 'bookings.user_id')
            ->where('bookings.status', 'awaiting_host_confirmation')
            ->where('bookings.expires_at', '<', now()->subMinutes(30));
        $count = $this->realUsers($query)->count();

        return $count > 0
            ? CheckResult::fail("$count demande(s) en attente de l'hôte ont dépassé leur délai sans être expirées (tâche d'expiration à l'arrêt ?).", ['demandes' => $count])
            : CheckResult::ok('Aucune demande expirée oubliée');
    }

    private function noBookings(): CheckResult
    {
        $hours = (int) config('ops.no_booking_hours');
        $recentQuery = DB::table('bookings')->leftJoin('users', 'users.id', '=', 'bookings.user_id')->where('bookings.created_at', '>=', now()->subHours($hours));
        $recent = $this->realUsers($recentQuery)->count();
        if ($recent > 0) {
            return CheckResult::ok("$recent demande(s) de réservation sur $hours h");
        }
        $olderQuery = DB::table('bookings')->leftJoin('users', 'users.id', '=', 'bookings.user_id')->where('bookings.created_at', '>=', now()->subDays(30));
        $older = $this->realUsers($olderQuery)->count();

        return $older > 0
            ? CheckResult::warn("Aucune demande de réservation depuis plus de $hours h (alors que $older sur 30 jours).")
            : CheckResult::ok('Peu d\'activité récente (rien d\'anormal à signaler)');
    }

    protected function whatsappTemplateStatus(string $name): ?string
    {
        $token = (string) Setting::get('whatsapp_token', '');
        $waba = (string) config('ops.whatsapp_waba_id', Setting::get('whatsapp_waba_id', ''));
        if ($token === '' || $waba === '') {
            return null;
        }
        $res = Http::withToken($token)->acceptJson()->timeout(15)->get("https://graph.facebook.com/v21.0/$waba/message_templates", ['name' => $name, 'fields' => 'name,status']);

        return $res->successful() ? ($res->json('data.0.status')) : null;
    }

    private function whatsappHealth(): CheckResult
    {
        if (!Setting::get('whatsapp_enabled', false)) {
            return CheckResult::ok('WhatsApp désactivé dans l\'admin');
        }
        $token = (string) Setting::get('whatsapp_token', '');
        $phone = (string) Setting::get('whatsapp_phone_id', '');
        $res = Http::withToken($token)->acceptJson()->timeout(15)->get("https://graph.facebook.com/v21.0/$phone", ['fields' => 'status,health_status']);
        if ($res->status() === 401 || $res->json('error.code') === 190) {
            return CheckResult::fail('Le jeton WhatsApp est invalide ou expiré : plus aucun message ne part.');
        }
        if (!$res->successful()) {
            return CheckResult::warn('État WhatsApp illisible (HTTP ' . $res->status() . ').');
        }
        if ($res->json('status') !== 'CONNECTED') {
            return CheckResult::fail('Le numéro WhatsApp n\'est plus connecté chez Meta (statut ' . $res->json('status') . ').');
        }
        $blocked = collect($res->json('health_status.entities') ?? [])->filter(fn ($e) => ($e['entity_type'] ?? '') === 'WABA' && ($e['can_send_message'] ?? '') === 'BLOCKED');
        if ($blocked->isNotEmpty()) {
            $reason = $blocked->first()['errors'][0]['error_description'] ?? 'raison inconnue';

            return CheckResult::fail('Le compte WhatsApp est bloqué en envoi : ' . $reason);
        }

        return CheckResult::ok('Numéro connecté, envoi possible');
    }

    private function aiProbe(): CheckResult
    {
        $public = $this->http->get($this->http->api('/settings/public'));
        if (!$public->json('ai_enabled')) {
            return CheckResult::ok('Assistant Bo désactivé dans l\'admin');
        }
        $res = $this->http->post($this->http->api('/assistant/ask'), ['question' => 'Bonjour, simple test technique de disponibilité.', 'history' => []], null, 60);
        if ($res->status() === 429) {
            return CheckResult::ok('Test ignoré (limite de questions atteinte)');
        }
        if (!$res->successful() || !is_string($res->json('data.answer')) || $res->json('data.answer') === '') {
            return CheckResult::fail('L\'assistant Bo ne répond pas (HTTP ' . $res->status() . ') : ' . mb_substr((string) ($res->json('message') ?? $res->body()), 0, 200));
        }

        return CheckResult::ok('Bo répond correctement');
    }
}
