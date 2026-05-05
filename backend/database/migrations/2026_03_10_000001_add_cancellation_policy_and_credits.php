<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'is_non_refundable')) {
                $table->boolean('is_non_refundable')->default(false)->after('payment_status')
                    ->comment('true = non remboursable (aucun remboursement ni avoir)');
            }
            if (!Schema::hasColumn('bookings', 'cancellation_policy_hours_snapshot')) {
                $table->unsignedSmallInteger('cancellation_policy_hours_snapshot')->nullable()->after('is_non_refundable')
                    ->comment('Heures avant arrivée pour modification gratuite (0 = non remboursable), à la création');
            }
        });

        if (!Schema::hasTable('client_credits')) {
            Schema::create('client_credits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->decimal('amount', 12, 2);
                $table->string('currency', 3)->default('XOF');
                $table->foreignId('source_booking_id')->nullable()->constrained('bookings')->nullOnDelete();
                $table->string('source_type', 32)->default('cancellation')->comment('cancellation, manual, promotion');
                $table->enum('status', ['available', 'used', 'expired'])->default('available');
                $table->timestamp('used_at')->nullable();
                $table->foreignId('used_for_booking_id')->nullable()->constrained('bookings')->nullOnDelete();
                $table->timestamp('expires_at')->nullable()->comment('Optionnel: validité de l\'avoir');
                $table->text('note')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
                $table->index('expires_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('client_credits');
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'is_non_refundable')) {
                $table->dropColumn('is_non_refundable');
            }
            if (Schema::hasColumn('bookings', 'cancellation_policy_hours_snapshot')) {
                $table->dropColumn('cancellation_policy_hours_snapshot');
            }
        });
    }
};
