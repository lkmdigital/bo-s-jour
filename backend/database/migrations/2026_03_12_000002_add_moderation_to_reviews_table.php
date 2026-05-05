<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->boolean('is_reported')->default(false)->after('host_replied_at');
            $table->string('report_reason', 500)->nullable()->after('is_reported');
            $table->unsignedInteger('report_count')->default(0)->after('report_reason');
            $table->string('moderation_status', 20)->default('approved')->after('report_count'); // approved, pending, hidden
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['is_reported', 'report_reason', 'report_count', 'moderation_status']);
        });
    }
};
