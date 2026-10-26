<?php

namespace App\Console\Commands;

use App\Models\Accommodation;
use App\Models\Room;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Crée (ou remet à jour) les comptes et l'établissement de test du moniteur. Ils sont marqués « synthétiques » :
 * invisibles du public (sauf requête du moniteur), sans e-mail, SMS ni WhatsApp réels, et exclus des alertes métier.
 */
class OpsSeedSynthetic extends Command
{
    protected $signature = 'ops:seed-synthetic {--write-env : Génère dans .env les mots de passe et secrets manquants (sans les afficher)}';

    protected $description = 'Supervision : crée les comptes de test (voyageur, partenaire, admin) et l\'établissement de test.';

    private const ENV_KEYS = ['OPS_MONITOR_SECRET', 'OPS_HEARTBEAT_TOKEN', 'OPS_TRAVELER_PASSWORD', 'OPS_HOST_PASSWORD', 'OPS_ADMIN_PASSWORD'];

    public function handle(): int
    {
        if ($this->option('write-env')) {
            $this->ensureEnvSecrets();
        }

        $prefix = (string) config('ops.synthetic_phone_prefix');
        $defs = [
            'traveler' => ['name' => 'Voyageur Test Supervision', 'role' => 'user', 'phone' => "+{$prefix}000001"],
            'host' => ['name' => 'Partenaire Test Supervision', 'role' => 'host', 'phone' => "+{$prefix}000002"],
            'admin' => ['name' => 'Admin Test Supervision', 'role' => 'admin', 'phone' => "+{$prefix}000003"],
        ];

        $users = [];
        foreach ($defs as $profile => $def) {
            $email = config("ops.accounts.$profile.email");
            $password = config("ops.accounts.$profile.password");
            if (!$email || !$password) {
                $this->error("Identifiants « $profile » absents : ajoutez OPS_" . strtoupper($profile) . '_EMAIL / _PASSWORD au .env (ou utilisez --write-env).');

                return self::FAILURE;
            }
            $user = User::where('email', $email)->first() ?? new User();
            $user->forceFill([
                'name' => $def['name'],
                'email' => $email,
                'password' => Hash::make($password),
                'phone' => $def['phone'],
                'role' => $def['role'],
                'status' => 'active',
                'email_verified_at' => now(),
                'two_factor_enabled' => false,
                'profile_completed' => true,
                'profile_verified' => true,
                'is_synthetic' => true,
            ])->save();
            $users[$profile] = $user;
            $this->line("✓ compte « $profile » : $email");
        }

        $accommodation = Accommodation::withoutGlobalScopes()->firstOrNew(['host_id' => $users['host']->id, 'is_synthetic' => true]);
        $accommodation->forceFill([
            'name' => config('ops.synthetic_accommodation_name'),
            'slug' => 'etablissement-test-supervision',
            'type' => 'hotel',
            'description' => 'Établissement fictif utilisé par la supervision pour tester le parcours de réservation. Ne pas réserver.',
            'address' => 'Abidjan (établissement de test)',
            'city' => 'Abidjan',
            'latitude' => 5.3599517,
            'longitude' => -4.0082563,
            'price_per_night' => 25000,
            'max_guests' => 4,
            'bedrooms' => 1,
            'bathrooms' => 1,
            'status' => 'published',
            'is_synthetic' => true,
        ])->save();

        Room::firstOrNew(['accommodation_id' => $accommodation->id, 'name' => 'Chambre test'])->forceFill([
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 25000,
            'is_active' => true,
            'quantity' => 20,
        ])->save();

        $this->info("✓ établissement de test #{$accommodation->id} (invisible du public)");

        return self::SUCCESS;
    }

    /** Ajoute au .env les clés manquantes (valeurs aléatoires, jamais affichées) et les prend en compte tout de suite. */
    private function ensureEnvSecrets(): void
    {
        $path = base_path('.env');
        $env = is_file($path) ? (string) file_get_contents($path) : '';
        $added = [];
        foreach (self::ENV_KEYS as $key) {
            if (preg_match('/^' . $key . '=.+$/m', $env)) {
                continue;
            }
            $value = Str::random(40);
            $env = rtrim(preg_replace('/^' . $key . '=.*$/m', '', $env) ?? $env) . "\n$key=$value\n";
            $added[] = $key;
            match ($key) {
                'OPS_MONITOR_SECRET' => config(['ops.monitor_secret' => $value]),
                'OPS_HEARTBEAT_TOKEN' => config(['ops.heartbeat_token' => $value]),
                'OPS_TRAVELER_PASSWORD' => config(['ops.accounts.traveler.password' => $value]),
                'OPS_HOST_PASSWORD' => config(['ops.accounts.host.password' => $value]),
                'OPS_ADMIN_PASSWORD' => config(['ops.accounts.admin.password' => $value]),
            };
        }
        if ($added) {
            file_put_contents($path, $env);
            $this->info('Clés ajoutées au .env : ' . implode(', ', $added) . ' (valeurs non affichées). Relancez `php artisan config:cache` en production.');
        }
    }
}
