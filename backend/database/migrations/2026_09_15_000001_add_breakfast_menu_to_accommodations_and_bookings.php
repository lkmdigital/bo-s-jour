<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Demande utilisateur 2026-09-15 : "Je parle du formulaire du choix des
// plats proposer au petit dej" — distinct de la QUANTITÉ de petits-déjeuners
// (livrée le 7 sept, Partie 4.11 du document d'origine, qui ne demandait
// qu'un nombre). Ici il s'agit du contenu réel du petit-déjeuner : chaque
// établissement saisit librement sa propre liste de plats/options (décision
// utilisateur : pas une liste de formules fixes imposée par la plateforme),
// et le voyageur coche ceux qu'il souhaite au moment de la réservation.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            // Liste libre de plats/options (ex: "Œufs", "Pain et confiture",
            // "Jus de fruit"...), saisie par l'hôte. Même format que
            // `amenities` (tableau JSON de chaînes), pour la même raison :
            // texte libre propre à chaque établissement, pas un référentiel
            // fixe de la plateforme.
            $table->json('breakfast_menu_items')->nullable()->after('breakfast_price');
        });

        Schema::table('bookings', function (Blueprint $table) {
            // Plats choisis par le voyageur parmi breakfast_menu_items de
            // l'établissement au moment de la réservation — un seul choix
            // pour tout le séjour (pas par petit-déjeuner unitaire), cohérent
            // avec la façon dont un hôtel demande habituellement les
            // préférences alimentaires d'un client.
            $table->json('breakfast_menu_selection')->nullable()->after('extra_breakfast_total');
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn('breakfast_menu_items');
        });
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('breakfast_menu_selection');
        });
    }
};
