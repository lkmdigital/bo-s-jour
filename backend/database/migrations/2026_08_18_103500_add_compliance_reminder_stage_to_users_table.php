<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Étape de relance conformité documentaire (0..4 = J+30/J+60/J+90/J+120
            // depuis l'inscription), module Paramètres > Conformité. Remise à 0 dès
            // que le compte redevient conforme (les relances repartiraient de zéro
            // en cas de nouvelle non-conformité).
            if (!Schema::hasColumn('users', 'compliance_reminder_stage')) {
                $table->unsignedTinyInteger('compliance_reminder_stage')->default(0)->after('host_onboarding_reminder_stage');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'compliance_reminder_stage')) {
                $table->dropColumn('compliance_reminder_stage');
            }
        });
    }
};
