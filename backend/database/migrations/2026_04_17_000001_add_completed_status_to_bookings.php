<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE bookings
            MODIFY COLUMN status
            ENUM('pending','confirmed','cancelled','completed')
            DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
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
