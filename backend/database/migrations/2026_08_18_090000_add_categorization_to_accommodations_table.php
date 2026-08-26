<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Rapport de vérification du parcours voyageur, points 5 et 6 :
     * - Sous-catégories pour les familles "Hôtel" (Appart-Hôtel, Motel, Auberge)
     *   et "Résidence" (Résidence Meublée, Résidence luxueuse) -> colonne `subtype`.
     * - Type d'établissement "Autre" avec zone de texte libre -> `type_other_label`.
     * - Identifiant unique par établissement, format "Code pays-Séquence 5
     *   chiffres-Année d'inscription" (ex: +225-00001-26) -> `establishment_code`.
     */
    public function up(): void
    {
        // MySQL n'a pas d'opération idempotente pour ajouter une valeur d'enum :
        // on redéfinit la liste complète (sans danger si déjà à jour). Sans
        // effet nécessaire sur SQLite (tests), où ce jeu de migrations n'a
        // pas besoin de la valeur 'other'.
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE accommodations MODIFY COLUMN type ENUM('hotel','lodge','guesthouse','apartment','other') NOT NULL");
        }

        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'subtype')) {
                // Sous-catégorie au sein de la famille "type" (ex: apart_hotel, motel,
                // auberge pour "hotel" ; furnished, luxury pour "apartment"/Résidence).
                $table->string('subtype', 30)->nullable()->after('type');
            }
            if (!Schema::hasColumn('accommodations', 'type_other_label')) {
                $table->string('type_other_label', 191)->nullable()->after('subtype');
            }
            if (!Schema::hasColumn('accommodations', 'establishment_code')) {
                $table->string('establishment_code', 30)->nullable()->unique()->after('id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (Schema::hasColumn('accommodations', 'subtype')) {
                $table->dropColumn('subtype');
            }
            if (Schema::hasColumn('accommodations', 'type_other_label')) {
                $table->dropColumn('type_other_label');
            }
            if (Schema::hasColumn('accommodations', 'establishment_code')) {
                $table->dropColumn('establishment_code');
            }
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE accommodations MODIFY COLUMN type ENUM('hotel','lodge','guesthouse','apartment') NOT NULL");
        }
    }
};
