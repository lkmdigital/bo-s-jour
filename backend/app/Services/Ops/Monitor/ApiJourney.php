<?php

namespace App\Services\Ops\Monitor;

/**
 * Parcours « API » d'un profil de test : connexion avec le compte synthétique, lecture des écrans
 * principaux de son espace, puis déconnexion (le jeton créé est supprimé : aucun jeton ne s'accumule).
 */
class ApiJourney
{
    /** Écrans lus pour chaque profil : libellé => chemin d'API (GET, réponse 200 attendue). */
    public const STEPS = [
        'traveler' => [
            'Mon profil' => '/me',
            'Tableau de bord voyageur' => '/analytics/traveler',
            'Notifications' => '/me/notifications',
            'Fidélité' => '/me/loyalty',
            'Paiements' => '/me/payments',
        ],
        'host' => [
            'Mes établissements' => '/accommodations/my',
            'Tableau de bord partenaire' => '/analytics/host',
            'Demandes et réservations' => '/bookings/host/overview',
        ],
        'admin' => [
            'Tableau de bord admin' => '/analytics/admin',
            'Statistiques' => '/admin/dashboard/stats',
            'Réservations' => '/admin/bookings?per_page=1',
        ],
    ];

    public function __construct(private MonitorHttp $http) {}

    public function run(string $profile): CheckResult
    {
        $account = config("ops.accounts.$profile");
        if (empty($account['email']) || empty($account['password'])) {
            return CheckResult::fail("Compte de test « $profile » non configuré (identifiants absents du .env).");
        }

        $login = $this->http->post($this->http->api('/login'), ['email' => $account['email'], 'password' => $account['password']]);
        $token = $login->json('token');
        if (!$login->successful() || !$token) {
            $why = $login->json('requires_2fa') ? 'double authentification demandée' : 'HTTP ' . $login->status();

            return CheckResult::fail("Connexion du compte de test « $profile » impossible ($why).", ['body' => mb_substr($login->body(), 0, 300)]);
        }

        $failures = [];
        $timings = [];
        try {
            foreach (self::STEPS[$profile] as $label => $path) {
                $t = microtime(true);
                $res = $this->http->get($this->http->api($path), [], $token);
                $timings[$label] = (int) round((microtime(true) - $t) * 1000);
                if (!$res->successful()) {
                    $failures[$label] = 'HTTP ' . $res->status();
                }
            }
        } finally {
            try {
                $this->http->post($this->http->api('/logout'), [], $token);
            } catch (\Throwable) {
                // la déconnexion échoue sans conséquence : le jeton sera purgé par le nettoyage
            }
        }

        if ($failures) {
            $list = collect($failures)->map(fn ($v, $k) => "$k ($v)")->implode(', ');

            return CheckResult::fail("Écran(s) en erreur côté $profile : $list.", ['erreurs' => $failures, 'durées_ms' => $timings]);
        }
        $slow = collect($timings)->filter(fn ($ms) => $ms > 4000);
        if ($slow->isNotEmpty()) {
            return CheckResult::warn('Réponses lentes (> 4 s) : ' . $slow->keys()->implode(', '), ['durées_ms' => $timings]);
        }

        return CheckResult::ok('Connexion et ' . count($timings) . ' écrans OK', ['durées_ms' => $timings]);
    }
}
