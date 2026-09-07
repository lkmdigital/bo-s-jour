<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 4.11) : "Une fois que le nombre de
// voyageurs est ≥ 2, il faut proposer : ☐ Autre petit déjeuner [...]
// afficher un champ de saisie libre permettant au voyageur de préciser
// le nombre de petit-déjeuner souhaité."
//
// L'établissement a déjà un système de petit-déjeuner (accommodations.
// breakfast_included / breakfast_included_persons / breakfast_price,
// migration 2025_11_13) mais jusqu'ici purement informatif : jamais utilisé
// dans un calcul de prix. "Autre" prend son sens complet une fois relié à
// ce système existant : des petits-déjeuners SUPPLÉMENTAIRES, au-delà de
// ceux inclus gratuitement, facturés au tarif breakfast_price de l'hôte.
//
// unit_price est un instantané du tarif au moment de la réservation (même
// principe que cancellation_policy_hours_snapshot) : si l'hôte change son
// tarif petit-déjeuner plus tard, les réservations déjà passées ne doivent
// pas être recalculées rétroactivement.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedInteger('extra_breakfast_quantity')->default(0)->after('estimated_arrival_time');
            $table->decimal('extra_breakfast_unit_price', 10, 2)->nullable()->after('extra_breakfast_quantity');
            $table->decimal('extra_breakfast_total', 10, 2)->default(0)->after('extra_breakfast_unit_price');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['extra_breakfast_quantity', 'extra_breakfast_unit_price', 'extra_breakfast_total']);
        });
    }
};
