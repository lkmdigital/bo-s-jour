<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 2) : "L'hôtelier voit des chiffres altérés
// par des remises ou promotions internes... Conserver systématiquement le
// prix d'origine fixé par l'hôtelier sur son tableau de bord." Confirmé avec
// l'utilisateur : l'hôte doit toucher 90% de SON tarif plein, même quand une
// promo/un bon de fidélité réduit ce que paie le voyageur — BoSéjour finance
// la différence. Jusqu'ici, seul le prix final (déjà net de remise) était
// conservé sur la réservation (`total_price`) ; le tarif d'origine était
// perdu après la création. `base_price` le conserve désormais, nullable :
// les réservations déjà créées avant ce champ (sans lui) continuent à
// utiliser total_price comme base de commission — pas de recalcul rétroactif
// des commissions déjà en attente, décision explicite de l'utilisateur.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('base_price', 12, 2)->nullable()->after('total_price');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('base_price');
        });
    }
};
