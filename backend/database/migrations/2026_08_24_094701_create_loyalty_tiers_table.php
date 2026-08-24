<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Niveaux de fidélité (Bronze/Argent/Or/Platine), seuils administrables.
     */
    public function up(): void
    {
        if (!Schema::hasTable('loyalty_tiers')) {
            Schema::create('loyalty_tiers', function (Blueprint $table) {
                $table->id();
                $table->string('key', 20)->unique();
                $table->string('label', 50);
                $table->unsignedInteger('min_points')->default(0);
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('active')->default(true);
                $table->timestamps();
            });

            DB::table('loyalty_tiers')->insert([
                ['key' => 'bronze', 'label' => 'Bronze', 'min_points' => 0, 'sort_order' => 1, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'argent', 'label' => 'Argent', 'min_points' => 500, 'sort_order' => 2, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'or', 'label' => 'Or', 'min_points' => 1500, 'sort_order' => 3, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['key' => 'platine', 'label' => 'Platine', 'min_points' => 5000, 'sort_order' => 4, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_tiers');
    }
};
