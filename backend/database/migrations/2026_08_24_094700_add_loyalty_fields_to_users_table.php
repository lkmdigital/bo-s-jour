<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Programme de fidélité (Programme Membre) : deux compteurs distincts —
     * loyalty_points_lifetime ne diminue jamais et détermine le niveau ;
     * loyalty_points_balance est la "cagnotte" de récompenses, débitée à
     * chaque bon réclamé. loyalty_tier est un ratchet (ne redescend jamais),
     * volontairement stocké plutôt que recalculé à chaque lecture pour
     * garantir la permanence des niveaux même si les seuils changent plus tard.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'loyalty_points_lifetime')) {
                $table->unsignedInteger('loyalty_points_lifetime')->default(0)->after('status');
            }
            if (!Schema::hasColumn('users', 'loyalty_points_balance')) {
                $table->unsignedInteger('loyalty_points_balance')->default(0)->after('loyalty_points_lifetime');
            }
            if (!Schema::hasColumn('users', 'loyalty_tier')) {
                $table->string('loyalty_tier', 20)->default('bronze')->after('loyalty_points_balance');
            }
            if (!Schema::hasColumn('users', 'referral_code')) {
                $table->string('referral_code', 20)->nullable()->unique()->after('loyalty_tier');
            }
            if (!Schema::hasColumn('users', 'referred_by_user_id')) {
                $table->foreignId('referred_by_user_id')->nullable()->after('referral_code')
                    ->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'referred_by_user_id')) {
                $table->dropConstrainedForeignId('referred_by_user_id');
            }
            $table->dropColumn(array_filter([
                Schema::hasColumn('users', 'loyalty_points_lifetime') ? 'loyalty_points_lifetime' : null,
                Schema::hasColumn('users', 'loyalty_points_balance') ? 'loyalty_points_balance' : null,
                Schema::hasColumn('users', 'loyalty_tier') ? 'loyalty_tier' : null,
                Schema::hasColumn('users', 'referral_code') ? 'referral_code' : null,
            ]));
        });
    }
};
