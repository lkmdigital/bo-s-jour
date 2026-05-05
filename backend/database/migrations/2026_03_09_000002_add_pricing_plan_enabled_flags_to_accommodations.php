<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Chaque plan tarifaire devient une option à cocher par l'hôte.
     */
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->boolean('pricing_non_refundable_enabled')->default(false)->after('pricing_auto_enabled');
            $table->boolean('pricing_modifiable_enabled')->default(false)->after('pricing_non_refundable_discount');
            $table->boolean('pricing_long_stay_enabled')->default(false)->after('pricing_modifiable_surcharge');
        });

        // Conserver l'ancien comportement : si tarification auto était activée, activer les 3 plans
        DB::table('accommodations')
            ->where('pricing_auto_enabled', true)
            ->update([
                'pricing_non_refundable_enabled' => true,
                'pricing_modifiable_enabled' => true,
                'pricing_long_stay_enabled' => true,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn([
                'pricing_non_refundable_enabled',
                'pricing_modifiable_enabled',
                'pricing_long_stay_enabled',
            ]);
        });
    }
};
