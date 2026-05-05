<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->after('email');
            $table->string('microsoft_id')->nullable()->after('google_id');
            $table->string('oauth_provider')->nullable()->after('microsoft_id'); // 'google' ou 'microsoft'
            $table->string('avatar')->nullable()->change(); // S'assurer que avatar peut être null
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_id', 'microsoft_id', 'oauth_provider']);
        });
    }
};
