<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Champs de "complétion du profil" (brief Parcours Voyageur, Phase 5) — tous facultatifs.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Étape 17 — Informations personnelles
            $table->string('gender')->nullable()->after('date_of_birth');         // Sexe
            $table->string('profession')->nullable()->after('gender');
            $table->string('preferred_language')->nullable()->after('profession'); // Langue préférée

            // Étape 18 — Localisation détaillée (address_line1 existe déjà pour l'adresse)
            $table->string('region')->nullable()->after('preferred_language');
            $table->string('commune')->nullable()->after('region');

            // Étape 19 — Préférences de voyage
            $table->string('preferred_accommodation_type')->nullable()->after('commune');
            $table->unsignedInteger('average_budget')->nullable()->after('preferred_accommodation_type'); // par nuitée
            $table->json('interests')->nullable()->after('average_budget');            // centres d'intérêt
            $table->string('travel_frequency')->nullable()->after('interests');
            $table->string('travel_purpose')->nullable()->after('travel_frequency');   // motif principal

            // Étape 20 — Communication & notifications
            $table->boolean('notif_email')->default(true)->after('travel_purpose');
            $table->boolean('notif_whatsapp')->default(true)->after('notif_email');
            $table->boolean('notif_sms')->default(false)->after('notif_whatsapp');
            $table->json('offer_types')->nullable()->after('notif_sms');               // promos / exclusives / nouveautés
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'gender', 'profession', 'preferred_language', 'region', 'commune',
                'preferred_accommodation_type', 'average_budget', 'interests',
                'travel_frequency', 'travel_purpose',
                'notif_email', 'notif_whatsapp', 'notif_sms', 'offer_types',
            ]);
        });
    }
};
