<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'traveler_type')) {
                $table->string('traveler_type', 20)->default('individual')->after('guests');
            }
            if (!Schema::hasColumn('bookings', 'company_name')) {
                $table->string('company_name')->nullable()->after('traveler_type');
            }
            if (!Schema::hasColumn('bookings', 'company_vat')) {
                $table->string('company_vat', 100)->nullable()->after('company_name');
            }
            if (!Schema::hasColumn('bookings', 'company_address')) {
                $table->string('company_address', 500)->nullable()->after('company_vat');
            }
            if (!Schema::hasColumn('bookings', 'company_billing_email')) {
                $table->string('company_billing_email')->nullable()->after('company_address');
            }
            if (!Schema::hasColumn('bookings', 'deferred_payment')) {
                $table->boolean('deferred_payment')->default(false)->after('company_billing_email');
            }
            if (!Schema::hasColumn('bookings', 'residence_country')) {
                $table->string('residence_country')->nullable()->after('deferred_payment');
            }
            if (!Schema::hasColumn('bookings', 'residence_city')) {
                $table->string('residence_city')->nullable()->after('residence_country');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_guest')) {
                // Compte créé automatiquement lors d'une réservation invité (à activer)
                $table->boolean('is_guest')->default(false)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'traveler_type', 'company_name', 'company_vat', 'company_address',
                'company_billing_email', 'deferred_payment', 'residence_country', 'residence_city',
            ]);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_guest');
        });
    }
};
