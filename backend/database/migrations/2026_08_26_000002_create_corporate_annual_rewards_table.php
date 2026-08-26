<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fige, pour une entreprise et une année données, le CA constaté et la
     * récompense Corporate qui en découle — un cliché indépendant de
     * corporate_reward_tiers pour que la modification ultérieure des seuils
     * ou libellés n'altère jamais l'historique déjà notifié à l'entreprise
     * (même principe que loyalty_tier sur users, jamais recalculé a posteriori).
     */
    public function up(): void
    {
        if (!Schema::hasTable('corporate_annual_rewards')) {
            Schema::create('corporate_annual_rewards', function (Blueprint $table) {
                $table->id();
                // Compte "responsable" Corporate (User::traveler_type === 'corporate'),
                // même notion que CorporateCollaborator::owner_id.
                $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
                $table->unsignedSmallInteger('year');
                $table->decimal('revenue_total', 14, 2);
                $table->foreignId('reward_tier_id')->nullable()->constrained('corporate_reward_tiers')->nullOnDelete();
                // Snapshot du libellé au moment du calcul — null si aucun palier atteint.
                $table->string('reward_label', 255)->nullable();
                $table->timestamp('computed_at');
                $table->timestamps();

                $table->unique(['owner_id', 'year']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('corporate_annual_rewards');
    }
};
