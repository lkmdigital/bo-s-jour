<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Paliers de CA annuel du Programme Corporate (doc client §12), distincts
     * des niveaux/paliers du Programme Membre. Seuils et libellés seedés
     * d'après le document mais administrables (le doc les marque lui-même
     * "paramétrables par l'administration") — les 4 montants sont à confirmer
     * avec le client, voir AdminCorporateController.
     */
    public function up(): void
    {
        if (!Schema::hasTable('corporate_reward_tiers')) {
            Schema::create('corporate_reward_tiers', function (Blueprint $table) {
                $table->id();
                $table->decimal('revenue_threshold', 14, 2)->unique();
                $table->string('reward_label', 255);
                $table->boolean('active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });

            DB::table('corporate_reward_tiers')->insert([
                ['revenue_threshold' => 10000000, 'reward_label' => 'Bon Corporate de 50 000 FCFA', 'sort_order' => 1, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['revenue_threshold' => 25000000, 'reward_label' => 'Crédit bo séjour de 100 000 FCFA', 'sort_order' => 2, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['revenue_threshold' => 50000000, 'reward_label' => 'Nuitées offertes / crédit hôtelier', 'sort_order' => 3, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['revenue_threshold' => 75000000, 'reward_label' => 'Tarif Corporate négocié', 'sort_order' => 4, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('corporate_reward_tiers');
    }
};
