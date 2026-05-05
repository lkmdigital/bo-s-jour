<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN purpose ENUM('deposit','balance','full','guarantee') NOT NULL DEFAULT 'full'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN purpose ENUM('deposit','balance','full') NOT NULL DEFAULT 'full'");
    }
};
