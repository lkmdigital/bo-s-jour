<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Étape de relance d'activation atteinte pour les comptes invités :
            // 0 = aucune, 1 = H+2 envoyée, 2 = H+24 envoyée, 3 = H+72 envoyée.
            $table->unsignedTinyInteger('activation_reminder_stage')->default(0)->after('is_guest');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('activation_reminder_stage');
        });
    }
};
