<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `awaiting_host_confirmation` (26 caractères) dépasse la limite actuelle de
 * from_status/to_status (varchar(20), 2026_04_17_000002) — "Data too long"
 * à l'insertion. Élargi à 40 pour absorber confortablement de futurs statuts.
 * SQL brut (pas de doctrine/dbal installé, donc pas de Blueprint::change()).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE booking_histories MODIFY COLUMN from_status VARCHAR(40) NULL');
        DB::statement('ALTER TABLE booking_histories MODIFY COLUMN to_status VARCHAR(40) NOT NULL');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE booking_histories MODIFY COLUMN from_status VARCHAR(20) NULL');
        DB::statement('ALTER TABLE booking_histories MODIFY COLUMN to_status VARCHAR(20) NOT NULL');
    }
};
