<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'no_show_at')) {
                $table->timestamp('no_show_at')->nullable();
            }
            if (!Schema::hasColumn('bookings', 'refund_amount')) {
                $table->decimal('refund_amount', 12, 2)->default(0);
            }
            if (!Schema::hasColumn('bookings', 'credit_amount')) {
                $table->decimal('credit_amount', 12, 2)->default(0);
            }
            if (!Schema::hasColumn('bookings', 'refunded_at')) {
                $table->timestamp('refunded_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['no_show_at', 'refund_amount', 'credit_amount', 'refunded_at']);
        });
    }
};
