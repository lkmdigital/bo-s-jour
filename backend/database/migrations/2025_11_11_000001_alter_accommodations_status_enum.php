<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ALTER ... ENUM est une syntaxe MySQL — sans effet nécessaire sur
        // SQLite (tests) où la colonne d'origine n'impose déjà aucune
        // contrainte de valeurs bloquante pour ce jeu de migrations.
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // Extend enum values to include operational statuses
        DB::statement("ALTER TABLE accommodations MODIFY COLUMN status ENUM('pending','published','rejected','unavailable','renovation') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // Revert to original enum
        DB::statement("ALTER TABLE accommodations MODIFY COLUMN status ENUM('pending','published','rejected') NOT NULL DEFAULT 'pending'");
    }
};
