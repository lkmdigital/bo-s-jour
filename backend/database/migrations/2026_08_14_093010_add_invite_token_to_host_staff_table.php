<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('host_staff', function (Blueprint $table) {
            // Jeton d'activation pour les invitations envoyées à une adresse sans compte
            // existant (brief Étape 26 : "lien sécurisé"). Consommé à l'activation.
            if (!Schema::hasColumn('host_staff', 'invite_token')) {
                $table->string('invite_token', 64)->nullable()->unique()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('host_staff', function (Blueprint $table) {
            $table->dropColumn('invite_token');
        });
    }
};
