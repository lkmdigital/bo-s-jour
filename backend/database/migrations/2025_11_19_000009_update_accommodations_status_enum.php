<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Mise à jour de l'enum status pour inclure removed et disabled
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // Pour MySQL, on doit modifier la colonne enum
        DB::statement("ALTER TABLE accommodations MODIFY COLUMN status ENUM('pending', 'published', 'rejected', 'unavailable', 'renovation', 'removed', 'disabled') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE accommodations MODIFY COLUMN status ENUM('pending', 'published', 'rejected', 'unavailable', 'renovation') DEFAULT 'pending'");
    }
};
