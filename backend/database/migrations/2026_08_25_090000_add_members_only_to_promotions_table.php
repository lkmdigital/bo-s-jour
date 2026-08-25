<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avantage réservé aux membres du Programme Membre (tarifs membres, offres
 * week-end/saisonnières, accès anticipé) — réutilise le mécanisme Promotion
 * existant plutôt qu'un nouveau système, avec un simple indicateur de
 * réservation. Voir design-refonte/brief/Programme de Fidélité .docx.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->boolean('members_only')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn('members_only');
        });
    }
};
