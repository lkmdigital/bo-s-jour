<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Index composite pour les requêtes de disponibilité (anti-surbooking)
            if (!$this->indexExists('bookings', 'idx_booking_availability')) {
                $table->index(
                    ['room_id', 'status', 'check_in', 'check_out'],
                    'idx_booking_availability'
                );
            }
            if (!$this->indexExists('bookings', 'idx_booking_user_status')) {
                $table->index(['user_id', 'status', 'created_at'], 'idx_booking_user_status');
            }
        });

        Schema::table('room_availabilities', function (Blueprint $table) {
            if (!$this->indexExists('room_availabilities', 'idx_availability_room_date_status')) {
                $table->index(['room_id', 'date', 'status'], 'idx_availability_room_date_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('idx_booking_availability');
            $table->dropIndex('idx_booking_user_status');
        });

        Schema::table('room_availabilities', function (Blueprint $table) {
            $table->dropIndex('idx_availability_room_date_status');
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        $indexes = \DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]);
        return count($indexes) > 0;
    }
};
