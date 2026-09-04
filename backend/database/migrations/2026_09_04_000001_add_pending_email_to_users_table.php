<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 : le responsable d'un établissement ne peut pas
// changer son adresse e-mail depuis l'Extranet (champ verrouillé en dur côté
// front). Ajout d'un changement d'e-mail avec confirmation par OTP envoyé à
// la NOUVELLE adresse (réutilise le mécanisme email_otp_code/expires_at déjà
// en place pour la vérification de connexion) : l'adresse n'est appliquée
// qu'une fois le code saisi, garantissant qu'elle est bien accessible.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('pending_email')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pending_email');
        });
    }
};
