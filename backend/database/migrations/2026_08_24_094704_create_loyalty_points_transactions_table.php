<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Grand livre des mouvements de points (gains et dépenses) — alimente
     * "Mon historique" côté voyageur et sert d'audit trail. points est signé
     * (positif = gain, négatif = dépense à la réclamation d'un bon).
     */
    public function up(): void
    {
        if (!Schema::hasTable('loyalty_points_transactions')) {
            Schema::create('loyalty_points_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->integer('points');
                $table->string('type', 30);
                $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
                $table->foreignId('voucher_id')->nullable()->constrained('loyalty_vouchers')->nullOnDelete();
                $table->string('description', 255)->nullable();
                $table->timestamps();

                $table->index(['user_id', 'created_at']);
                $table->index('type');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_points_transactions');
    }
};
