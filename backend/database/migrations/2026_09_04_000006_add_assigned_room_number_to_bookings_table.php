<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 4.2/4.10) : "numéro de chambre, LORSQU'IL
// EST ATTRIBUÉ" — le système réserve un TYPE de chambre en pool
// (rooms.quantity), pas une unité individuellement suivie ; construire un
// vrai inventaire de chambres numérotées serait une refonte du modèle de
// données, pas ce qui est demandé ici. Ce champ est l'information
// opérationnelle que l'hôte saisit librement quand il attribue une chambre
// physique (souvent à l'arrivée) — nullable, jamais requis.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('assigned_room_number', 50)->nullable()->after('room_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('assigned_room_number');
        });
    }
};
