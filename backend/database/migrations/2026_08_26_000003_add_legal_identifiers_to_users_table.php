<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Profil entreprise (doc client §9) : RCCM, Numéro de Compte Contribuable
     * et Identifiant Unique sont trois identifiants légaux distincts en Côte
     * d'Ivoire — distincts de company_vat (TVA), déjà existant. Ajoute aussi
     * le secteur d'activité, seul champ §9 restant.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'company_rccm')) {
                $table->string('company_rccm', 100)->nullable()->after('company_vat');
            }
            if (!Schema::hasColumn('users', 'company_tax_number')) {
                $table->string('company_tax_number', 100)->nullable()->after('company_rccm');
            }
            if (!Schema::hasColumn('users', 'company_unique_id')) {
                $table->string('company_unique_id', 100)->nullable()->after('company_tax_number');
            }
            if (!Schema::hasColumn('users', 'company_sector')) {
                $table->string('company_sector', 255)->nullable()->after('company_unique_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(array_filter([
                Schema::hasColumn('users', 'company_rccm') ? 'company_rccm' : null,
                Schema::hasColumn('users', 'company_tax_number') ? 'company_tax_number' : null,
                Schema::hasColumn('users', 'company_unique_id') ? 'company_unique_id' : null,
                Schema::hasColumn('users', 'company_sector') ? 'company_sector' : null,
            ]));
        });
    }
};
