<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Garantie de réservation paramétrée par l'établissement (décision BoSéjour 2026-10-08).
 *
 * `deposit_amount` stockait déjà le TYPE (first_night | percentage | fixed) mais aucune
 * valeur : un pourcentage ou un montant fixe ne pouvait donc pas être appliqué, et le
 * paiement retombait toujours sur la 1re nuit. Ces deux colonnes portent la valeur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'deposit_percentage')) {
                $table->decimal('deposit_percentage', 5, 2)->nullable()->after('deposit_amount');
            }
            if (!Schema::hasColumn('accommodations', 'deposit_fixed_amount')) {
                $table->decimal('deposit_fixed_amount', 12, 2)->nullable()->after('deposit_percentage');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            foreach (['deposit_fixed_amount', 'deposit_percentage'] as $column) {
                if (Schema::hasColumn('accommodations', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
