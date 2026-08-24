<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * loyalty_points_awarded_at : idempotence de la commande planifiée
     * d'attribution de points post-séjour (même patron que
     * review_link_sent_at / SendPostStayReviewLinks).
     * loyalty_voucher_id : bon de fidélité appliqué, miroir de promotion_id
     * déjà existant — un voyageur choisit soit un code promo hôte, soit un
     * bon de fidélité, jamais les deux (cf. plan, décision #1).
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'loyalty_points_awarded_at')) {
                $table->timestamp('loyalty_points_awarded_at')->nullable()->after('review_link_sent_at');
            }
            if (!Schema::hasColumn('bookings', 'loyalty_voucher_id')) {
                $table->foreignId('loyalty_voucher_id')->nullable()->after('promotion_id')
                    ->constrained('loyalty_vouchers')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'loyalty_voucher_id')) {
                $table->dropConstrainedForeignId('loyalty_voucher_id');
            }
            if (Schema::hasColumn('bookings', 'loyalty_points_awarded_at')) {
                $table->dropColumn('loyalty_points_awarded_at');
            }
        });
    }
};
