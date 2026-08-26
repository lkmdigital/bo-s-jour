<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE room_availabilities MODIFY status ENUM('available','occupied','blocked','maintenance') NOT NULL DEFAULT 'available'");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE room_availabilities MODIFY status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available'");
    }
};
