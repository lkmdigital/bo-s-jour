<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 4.3) : "nombre de chambres" fait partie
// des champs attendus dans le détail hôte/admin d'une réservation — jusqu'ici
// absent car une réservation ne portait qu'UNE chambre (room_id singulier).
// Confirmé avec l'utilisateur : construire la réservation multi-chambres
// (même type de chambre, plusieurs unités) plutôt que d'afficher "1" par
// défaut. S'appuie sur rooms.quantity (nombre total d'unités de ce type),
// déjà utilisé par le contrôle de disponibilité quantity-aware (Partie 4.5).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedInteger('rooms_quantity')->default(1)->after('room_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('rooms_quantity');
        });
    }
};
