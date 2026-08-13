<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            // Rempli quand l'hôte clique "Publier mon établissement" après avoir
            // passé la checklist (brief Extranet Partenaire, Étape 21) — distingue
            // "encore en configuration" de "prêt pour la revue admin", en plus du
            // statut pending existant.
            if (!Schema::hasColumn('accommodations', 'submitted_for_review_at')) {
                $table->timestamp('submitted_for_review_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn('submitted_for_review_at');
        });
    }
};
