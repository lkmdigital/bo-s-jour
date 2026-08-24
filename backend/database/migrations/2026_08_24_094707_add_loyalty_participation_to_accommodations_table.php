<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Participation volontaire de l'établissement au programme de fidélité
     * (l'hôte accepte de financer les avantages accordés aux membres, en
     * échange d'une meilleure visibilité). Présence de la date = participant.
     * Décision de l'hôte, distincte de is_featured (mise en avant pilotée
     * par la plateforme).
     */
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'loyalty_program_joined_at')) {
                $table->timestamp('loyalty_program_joined_at')->nullable()->after('is_featured');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (Schema::hasColumn('accommodations', 'loyalty_program_joined_at')) {
                $table->dropColumn('loyalty_program_joined_at');
            }
        });
    }
};
