<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 4.4) : "Modifiée" fait partie des statuts
// de réservation proposés à valider. Une réservation n'a qu'un seul statut
// principal (pending/confirmed/cancelled/completed) qui reste le fil
// directeur du cycle de vie — "Modifiée" est donc un INDICATEUR affiché à
// côté du statut principal (ex. "Confirmée · Modifiée"), pas un état qui le
// remplace. Colonne booléenne simple plutôt qu'une requête sur
// bookings_history à chaque affichage (liste incluse, pas seulement détail).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->boolean('was_modified')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('was_modified');
        });
    }
};
