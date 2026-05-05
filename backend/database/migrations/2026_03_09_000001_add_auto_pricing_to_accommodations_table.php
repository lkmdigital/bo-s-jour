<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Option de tarification automatique configurable par l'hôte.
     */
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->boolean('pricing_auto_enabled')->default(false)->after('invoice_paid_before_hours');
            $table->decimal('pricing_non_refundable_discount', 5, 2)->nullable()->after('pricing_auto_enabled')->comment('% à retrancher pour non remboursable');
            $table->decimal('pricing_modifiable_surcharge', 5, 2)->nullable()->after('pricing_non_refundable_discount')->comment('% à ajouter pour modifiable');
            $table->decimal('pricing_long_stay_discount', 5, 2)->nullable()->after('pricing_modifiable_surcharge')->comment('% à retrancher pour long séjour');
            $table->unsignedTinyInteger('pricing_long_stay_nights')->nullable()->after('pricing_long_stay_discount')->comment('Seuil nuits pour long séjour');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn([
                'pricing_auto_enabled',
                'pricing_non_refundable_discount',
                'pricing_modifiable_surcharge',
                'pricing_long_stay_discount',
                'pricing_long_stay_nights',
            ]);
        });
    }
};
