<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 4.3) : "heure d'arrivée prévisionnelle"
// demandée dans le détail de réservation — aucun champ de saisie n'existait
// dans le tunnel de réservation pour la collecter. Facultatif : ne bloque
// pas une réservation qui ne la précise pas.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->time('estimated_arrival_time')->nullable()->after('guests');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('estimated_arrival_time');
        });
    }
};
