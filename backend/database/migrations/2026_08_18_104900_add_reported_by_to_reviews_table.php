<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Audit qualité (module Avis clients) : ReviewController::report() n'empêchait
     * pas un même utilisateur de signaler plusieurs fois le même avis (report_count
     * gonflé artificiellement, moderation_status remis à 'pending' en boucle).
     * Cette colonne trace qui a déjà signalé, pour rendre le signalement idempotent.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (!Schema::hasColumn('reviews', 'reported_by')) {
                $table->json('reported_by')->nullable()->after('report_count');
            }
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            if (Schema::hasColumn('reviews', 'reported_by')) {
                $table->dropColumn('reported_by');
            }
        });
    }
};
