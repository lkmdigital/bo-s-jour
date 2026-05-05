<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Structure pour les réservations de groupe (à implémenter ultérieurement).
 * Règles prévues : acompte obligatoire, délais de paiement spécifiques, conditions contractuelles dédiées.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'booking_type')) {
                $table->string('booking_type', 20)->default('standard')->after('cancellation_policy_hours_snapshot')
                    ->comment('standard | group (réservations groupe : acompte, délais, conditions dédiées)');
            }
            if (!Schema::hasColumn('bookings', 'group_deposit_percent')) {
                $table->decimal('group_deposit_percent', 5, 2)->nullable()->after('booking_type')
                    ->comment('Pour booking_type=group : % d\'acompte obligatoire');
            }
            if (!Schema::hasColumn('bookings', 'group_payment_deadline_days')) {
                $table->unsignedSmallInteger('group_payment_deadline_days')->nullable()->after('group_deposit_percent')
                    ->comment('Pour booking_type=group : délai en jours pour solder le solde');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'booking_type')) {
                $table->dropColumn('booking_type');
            }
            if (Schema::hasColumn('bookings', 'group_deposit_percent')) {
                $table->dropColumn('group_deposit_percent');
            }
            if (Schema::hasColumn('bookings', 'group_payment_deadline_days')) {
                $table->dropColumn('group_payment_deadline_days');
            }
        });
    }
};
