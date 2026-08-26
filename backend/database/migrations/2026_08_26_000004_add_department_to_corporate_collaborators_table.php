<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Départements (doc client §10 : "Elle peut notamment gérer : les
     * collaborateurs autorisés à réserver ; les départements ; les plafonds
     * de réservation."). Champ libre plutôt qu'une table dédiée : le doc ne
     * décrit aucun autre usage d'un référentiel de départements que le
     * regroupement des dépenses (§13), qu'un texte libre par collaborateur
     * suffit à couvrir.
     */
    public function up(): void
    {
        Schema::table('corporate_collaborators', function (Blueprint $table) {
            if (!Schema::hasColumn('corporate_collaborators', 'department')) {
                $table->string('department', 100)->nullable()->after('name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('corporate_collaborators', function (Blueprint $table) {
            if (Schema::hasColumn('corporate_collaborators', 'department')) {
                $table->dropColumn('department');
            }
        });
    }
};
