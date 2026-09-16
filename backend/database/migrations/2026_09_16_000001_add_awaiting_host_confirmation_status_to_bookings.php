<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-16 : parcours "confirmation hôte avant paiement" —
 * nouveau statut BookingStatus::AwaitingHostConfirmation, précédant Pending
 * (voir App\Enums\BookingStatus). `status` est un ENUM MySQL natif (créé par
 * 2024_01_01_000004, étendu par 2026_04_17_000001 pour "completed") : sans
 * cette migration, toute tentative d'insertion avec la nouvelle valeur PHP
 * échoue en base ("Data truncated for column 'status'").
 */
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
            ENUM('awaiting_host_confirmation','pending','confirmed','cancelled','completed')
            DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        // Repli sur 'cancelled' avant de retirer la valeur (mêmes précautions
        // que 2026_04_17_000001 pour 'completed').
        DB::statement("UPDATE bookings SET status = 'cancelled' WHERE status = 'awaiting_host_confirmation'");

        DB::statement("
            ALTER TABLE bookings
            MODIFY COLUMN status
            ENUM('pending','confirmed','cancelled','completed')
            DEFAULT 'pending'
        ");
    }
};
