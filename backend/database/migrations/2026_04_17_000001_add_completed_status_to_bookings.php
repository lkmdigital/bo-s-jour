<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE bookings
            MODIFY COLUMN status
            ENUM('pending','confirmed','cancelled','completed')
            DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // Convertir completed → cancelled avant de supprimer la valeur
        DB::statement("UPDATE bookings SET status = 'cancelled' WHERE status = 'completed'");

        DB::statement("
            ALTER TABLE bookings
            MODIFY COLUMN status
            ENUM('pending','confirmed','cancelled')
            DEFAULT 'pending'
        ");
    }
};
