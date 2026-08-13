<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Étape de relance anti-abandon hôte (0..3 = H+24/H+72/H+168), brief
            // Extranet Partenaire Étape 34. Distinct de activation_reminder_stage
            // (voyageur invité) : sémantique différente (hôte, jamais is_guest).
            if (!Schema::hasColumn('users', 'host_onboarding_reminder_stage')) {
                $table->unsignedTinyInteger('host_onboarding_reminder_stage')->default(0)->after('activation_reminder_stage');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('host_onboarding_reminder_stage');
        });
    }
};
