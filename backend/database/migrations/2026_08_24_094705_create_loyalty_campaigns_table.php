<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Campagnes de points bonus (Double/Triple Points, Week-end/Vacances
     * Bonus) — conditions et dates administrables.
     */
    public function up(): void
    {
        if (!Schema::hasTable('loyalty_campaigns')) {
            Schema::create('loyalty_campaigns', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->enum('type', ['double_points', 'triple_points', 'weekend_bonus', 'vacances_bonus', 'custom'])->default('custom');
                $table->decimal('multiplier', 4, 2)->nullable();
                $table->unsignedInteger('bonus_points')->nullable();
                $table->timestamp('starts_at');
                $table->timestamp('ends_at');
                $table->boolean('active')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['active', 'starts_at', 'ends_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_campaigns');
    }
};
