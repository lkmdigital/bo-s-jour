<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'payment_type')) {
                $table->string('payment_type', 20)->nullable()->after('deposit_amount')
                    ->comment('full=paiement intégral, guarantee=garantie 1ère nuit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'payment_type')) {
                $table->dropColumn('payment_type');
            }
        });
    }
};
