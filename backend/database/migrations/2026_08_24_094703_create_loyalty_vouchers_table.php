<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bons de réduction émis par réclamation d'un palier de la cagnotte.
     * Émission et usage sont deux étapes distinctes (cf. plan) : un bon existe
     * et expire indépendamment de la réservation sur laquelle il sera utilisé.
     */
    public function up(): void
    {
        if (!Schema::hasTable('loyalty_vouchers')) {
            Schema::create('loyalty_vouchers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('reward_tier_id')->nullable()->constrained('loyalty_reward_tiers')->nullOnDelete();
                $table->string('code', 20)->unique();
                $table->decimal('discount_percent', 5, 2);
                $table->timestamp('issued_at');
                $table->timestamp('expires_at')->nullable();
                $table->enum('status', ['available', 'used', 'expired'])->default('available');
                $table->foreignId('used_for_booking_id')->nullable()->constrained('bookings')->nullOnDelete();
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_vouchers');
    }
};
