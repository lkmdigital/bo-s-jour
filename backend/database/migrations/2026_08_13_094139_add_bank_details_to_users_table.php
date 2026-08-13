<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Coordonnées bancaires (RIB) de l'hôte, pour les reversements —
            // brief Extranet Partenaire, Étape 20. Saisies une fois dans le
            // profil et réutilisées pour chaque demande de retrait.
            if (!Schema::hasColumn('users', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('tax_account_number');
            }
            if (!Schema::hasColumn('users', 'bank_account_holder')) {
                $table->string('bank_account_holder')->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('users', 'bank_account_number')) {
                $table->string('bank_account_number')->nullable()->after('bank_account_holder');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_account_holder', 'bank_account_number']);
        });
    }
};
