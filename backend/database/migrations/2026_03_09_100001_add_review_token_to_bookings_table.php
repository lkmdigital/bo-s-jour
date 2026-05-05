<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('review_token', 64)->nullable()->unique()->after('expires_at');
            $table->timestamp('review_link_sent_at')->nullable()->after('review_token');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['review_token', 'review_link_sent_at']);
        });
    }
};
