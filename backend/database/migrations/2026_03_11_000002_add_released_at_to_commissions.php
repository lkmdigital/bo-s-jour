<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * released_at = date à laquelle le séjour a commencé (check-in).
     * Tant que null, le host_amount ne compte pas dans le solde disponible pour retrait.
     */
    public function up(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->timestamp('released_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            $table->dropColumn('released_at');
        });
    }
};
