<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'booked_for_third_party')) {
                $table->boolean('booked_for_third_party')->default(false)->after('special_requests');
            }

            if (!Schema::hasColumn('bookings', 'traveler_name')) {
                $table->string('traveler_name')->nullable()->after('booked_for_third_party');
            }

            if (!Schema::hasColumn('bookings', 'traveler_phone')) {
                $table->string('traveler_phone', 20)->nullable()->after('traveler_name');
            }

            if (!Schema::hasColumn('bookings', 'traveler_email')) {
                $table->string('traveler_email')->nullable()->after('traveler_phone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'traveler_email')) {
                $table->dropColumn('traveler_email');
            }

            if (Schema::hasColumn('bookings', 'traveler_phone')) {
                $table->dropColumn('traveler_phone');
            }

            if (Schema::hasColumn('bookings', 'traveler_name')) {
                $table->dropColumn('traveler_name');
            }

            if (Schema::hasColumn('bookings', 'booked_for_third_party')) {
                $table->dropColumn('booked_for_third_party');
            }
        });
    }
};
