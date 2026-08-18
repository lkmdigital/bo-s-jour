<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Audit qualité (module Inspections) : InspectionController::pause() ne
     * persistait aucun état ("on garde le statut in_progress... pour l'instant"),
     * malgré un bouton "Mettre en pause" réel côté admin. Cette colonne rend
     * l'action effective (bascule pause/reprise).
     */
    public function up(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            if (!Schema::hasColumn('inspections', 'paused_at')) {
                $table->timestamp('paused_at')->nullable()->after('started_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            if (Schema::hasColumn('inspections', 'paused_at')) {
                $table->dropColumn('paused_at');
            }
        });
    }
};
