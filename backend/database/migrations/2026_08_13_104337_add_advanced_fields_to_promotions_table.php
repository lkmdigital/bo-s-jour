<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            // Type de réduction (brief Extranet Partenaire, Étape 33). 'percent' reste
            // le comportement historique (discount_percent), les autres modes sont
            // nouveaux — voir discount_amount pour leur valeur.
            if (!Schema::hasColumn('promotions', 'discount_type')) {
                $table->enum('discount_type', ['percent', 'fixed', 'free_night'])->default('percent')->after('discount_percent');
            }
            // Montant fixe (FCFA) pour le mode 'fixed'. Ignoré pour 'percent'/'free_night'.
            if (!Schema::hasColumn('promotions', 'discount_amount')) {
                $table->decimal('discount_amount', 10, 2)->nullable()->after('discount_type');
            }
            // Séjour minimum requis pour bénéficier de la promotion.
            if (!Schema::hasColumn('promotions', 'min_stay_nights')) {
                $table->unsignedSmallInteger('min_stay_nights')->nullable()->after('discount_amount');
            }
            // Code promo : si renseigné, la promotion ne s'applique que si le voyageur
            // saisit ce code exact à la réservation (sinon reste automatique, comme avant).
            if (!Schema::hasColumn('promotions', 'promo_code')) {
                $table->string('promo_code')->nullable()->after('min_stay_nights');
            }
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_amount', 'min_stay_nights', 'promo_code']);
        });
    }
};
