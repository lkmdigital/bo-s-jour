<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rapport de vérification parcours voyageur, point 1 : sans ces champs, une réservation
 * "Pour une entreprise" sans création de compte ensuite ne capte jamais la localisation
 * de la société (aucune autre source ne l'enregistre pour un compte invité).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'company_country')) {
                $table->string('company_country')->nullable()->after('company_address');
            }
            if (!Schema::hasColumn('bookings', 'company_city')) {
                $table->string('company_city')->nullable()->after('company_country');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['company_country', 'company_city']);
        });
    }
};
