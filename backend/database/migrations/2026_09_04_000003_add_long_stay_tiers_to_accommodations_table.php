<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 3) : remises automatiques long séjour à
// 3 paliers fixes (3-5 nuits, 6-10 nuits, 11+ nuits), chacun activable
// indépendamment avec un pourcentage modifiable — remplace le système à
// palier unique existant (pricing_long_stay_enabled/discount/nights, ajouté
// 2026-03-09) qui ne permettait qu'un seul seuil. Les anciens champs sont
// conservés tels quels (RoomPricingService bascule sur les paliers dès que
// ce nouveau champ est renseigné, sinon garde l'ancien comportement) — aucun
// établissement déjà configuré n'est affecté tant que l'hôte ne rouvre pas
// ses paramètres tarifaires.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->json('pricing_long_stay_tiers')->nullable()->after('pricing_long_stay_nights');
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn('pricing_long_stay_tiers');
        });
    }
};
