<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rendre le nom de la chambre nullable (le type suffit, name peut être vide).
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE rooms MODIFY name VARCHAR(255) NULL');
        } else {
            Schema::table('rooms', function (Blueprint $table) {
                $table->string('name')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE rooms MODIFY name VARCHAR(255) NOT NULL');
        } else {
            Schema::table('rooms', function (Blueprint $table) {
                $table->string('name')->nullable(false)->change();
            });
        }
    }
};
