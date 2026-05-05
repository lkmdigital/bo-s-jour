<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Role;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Crée ou réinitialise le compte administrateur par défaut.
 * Usage : php artisan admin:create-default
 */
class CreateDefaultAdmin extends Command
{
    protected $signature = 'admin:create-default
                            {--email=admin@monbeaupays.com : Email du compte admin}
                            {--password=AdminMonBeauPays2025! : Mot de passe (changez en production)}';

    protected $description = 'Crée ou réinitialise le compte administrateur par défaut';

    public function handle(): int
    {
        $email = $this->option('email');
        $password = $this->option('password');

        $admin = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'Administrateur',
                'password' => Hash::make($password),
                'role' => 'admin',
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        // Forcer le rôle admin (au cas où le compte existait en "user" / voyageur)
        $admin->role = 'admin';
        $admin->save();

        $adminRole = Role::where('name', 'admin')->first();
        if ($adminRole) {
            $admin->roles()->sync([$adminRole->id]);
        }

        $admin->refresh();
        $this->info('Compte administrateur prêt. Rôle en base : ' . $admin->role);
        $this->newLine();
        $this->line('--- ACCÈS DASHBOARD ADMIN ---');
        $this->line('Email    : ' . $email);
        $this->line('Mot de passe : ' . $password);
        $this->newLine();
        $this->line('Connectez-vous sur la page login du frontend, puis accédez à /dashboard/admin');
        $this->newLine();
        $this->warn('En production, changez le mot de passe après la première connexion.');

        return self::SUCCESS;
    }
}
