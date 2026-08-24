<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Paliers de la cagnotte de récompenses (points → bon de réduction en %),
     * distincts des niveaux de fidélité (loyalty_tiers). Administrables.
     */
    public function up(): void
    {
        if (!Schema::hasTable('loyalty_reward_tiers')) {
            Schema::create('loyalty_reward_tiers', function (Blueprint $table) {
                $table->id();
                $table->unsignedInteger('points_required')->unique();
                $table->decimal('discount_percent', 5, 2);
                $table->boolean('active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });

            DB::table('loyalty_reward_tiers')->insert([
                ['points_required' => 250, 'discount_percent' => 2.5, 'sort_order' => 1, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['points_required' => 500, 'discount_percent' => 5, 'sort_order' => 2, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['points_required' => 1000, 'discount_percent' => 7.5, 'sort_order' => 3, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['points_required' => 2500, 'discount_percent' => 10, 'sort_order' => 4, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['points_required' => 5000, 'discount_percent' => 15, 'sort_order' => 5, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_reward_tiers');
    }
};
