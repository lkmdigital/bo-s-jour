<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Comptes de test dédiés à l'audit de sécurité externe demandé par HCS Consulting
 * (2026-09-27) : 2 voyageurs, 2 partenaires, 1 admin de test — jamais le vrai compte
 * admin. Reconnaissables par leur domaine e-mail @bosejour-test.local (jamais envoyé
 * réellement, ne collide avec aucun vrai compte) pour être retrouvés et supprimés
 * facilement une fois l'audit terminé (voir `audit:test-accounts remove`).
 */
class ManageAuditTestAccounts extends Command
{
    protected $signature = 'audit:test-accounts {action : create|remove} {--reset-passwords : Avec create, régénère le mot de passe des comptes déjà existants}';

    protected $description = "Crée ou supprime les comptes de test réservés à l'audit de sécurité externe (voyageurs, partenaires, admin de test).";

    private const ACCOUNTS = [
        ['role' => 'user', 'name' => 'Audit Voyageur 1', 'email' => 'audit.voyageur1@bosejour-test.local'],
        ['role' => 'user', 'name' => 'Audit Voyageur 2', 'email' => 'audit.voyageur2@bosejour-test.local'],
        ['role' => 'host', 'name' => 'Audit Partenaire 1', 'email' => 'audit.hote1@bosejour-test.local'],
        ['role' => 'host', 'name' => 'Audit Partenaire 2', 'email' => 'audit.hote2@bosejour-test.local'],
        ['role' => 'admin', 'name' => 'Audit Admin (test)', 'email' => 'audit.admin@bosejour-test.local'],
    ];

    public function handle(): int
    {
        return match ($this->argument('action')) {
            'create' => $this->create(),
            'remove' => $this->remove(),
            default => $this->fail("Action inconnue : utilisez 'create' ou 'remove'."),
        };
    }

    private function create(): int
    {
        $rows = [];

        foreach (self::ACCOUNTS as $spec) {
            $user = User::where('email', $spec['email'])->first();
            $isNew = !$user;

            if ($user && !$this->option('reset-passwords')) {
                $rows[] = [$spec['role'], $spec['email'], '(déjà créé — mot de passe inchangé)'];
                continue;
            }

            $password = Str::password(16, symbols: false);

            $user = User::updateOrCreate(
                ['email' => $spec['email']],
                [
                    'name' => $spec['name'],
                    'password' => Hash::make($password),
                    'role' => $spec['role'],
                    'email_verified_at' => now(),
                    'phone' => '0700000000',
                ]
            );

            $rows[] = [$spec['role'], $spec['email'], $password . ($isNew ? '' : ' (régénéré)')];
        }

        $this->table(['Rôle', 'E-mail', 'Mot de passe'], $rows);
        $this->newLine();
        $this->warn("Notez ces mots de passe maintenant : ils ne sont ni stockés ni ré-affichables (hachés en base).");
        $this->info("Une fois l'audit terminé : php artisan audit:test-accounts remove");

        return self::SUCCESS;
    }

    private function remove(): int
    {
        $emails = array_column(self::ACCOUNTS, 'email');
        $count = User::whereIn('email', $emails)->delete();

        $this->info("{$count} compte(s) de test audit supprimé(s).");

        return self::SUCCESS;
    }
}
