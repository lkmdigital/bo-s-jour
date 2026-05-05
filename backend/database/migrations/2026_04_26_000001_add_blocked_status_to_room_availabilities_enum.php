<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE room_availabilities MODIFY status ENUM('available','occupied','blocked','maintenance') NOT NULL DEFAULT 'available'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE room_availabilities MODIFY status ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available'");
    }
};
