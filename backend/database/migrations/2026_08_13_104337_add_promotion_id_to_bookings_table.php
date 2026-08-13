<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Trace la promotion appliquée (si une l'a été), pour le suivi de
            // performance côté hôte (brief Étape 33 : réservations générées,
            // chiffre d'affaires) — jamais tracé jusqu'ici.
            if (!Schema::hasColumn('bookings', 'promotion_id')) {
                $table->foreignId('promotion_id')->nullable()->after('room_id')
                    ->constrained('promotions')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('promotion_id');
        });
    }
};
