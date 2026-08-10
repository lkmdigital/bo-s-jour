<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Identité (le brief distingue Nom et Prénoms ; on garde aussi `name` = "Prénoms Nom")
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');

            // Informations statistiques (obligatoires côté voyageur — brief Étape 8)
            $table->string('residence_country')->nullable()->after('whatsapp');
            $table->string('residence_city')->nullable()->after('residence_country');
            $table->string('nationality')->nullable()->after('residence_city');

            // Type de voyageur + profil Corporate conservé (brief Étape 7.1)
            $table->enum('traveler_type', ['individual', 'corporate'])->default('individual')->after('nationality');
            $table->string('company_name')->nullable()->after('traveler_type');
            $table->string('company_vat')->nullable()->after('company_name');
            $table->string('company_address')->nullable()->after('company_vat');
            $table->string('company_city')->nullable()->after('company_address');
            $table->string('company_country')->nullable()->after('company_city');
            $table->string('company_service')->nullable()->after('company_country');
            $table->string('company_project')->nullable()->after('company_service');
            $table->string('company_billing_email')->nullable()->after('company_project');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name', 'last_name',
                'residence_country', 'residence_city', 'nationality',
                'traveler_type',
                'company_name', 'company_vat', 'company_address', 'company_city',
                'company_country', 'company_service', 'company_project', 'company_billing_email',
            ]);
        });
    }
};
