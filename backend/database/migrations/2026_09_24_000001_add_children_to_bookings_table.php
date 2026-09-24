<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Retour client 2026-09-24 : distinguer adultes et enfants.
     * `guests` reste le nombre TOTAL de voyageurs (adultes + enfants) — c'est lui qui sert
     * aux contrôles de capacité ; `children` en est la part d'enfants (adultes = guests - children).
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedTinyInteger('children')->default(0)->after('guests');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('children');
        });
    }
};
