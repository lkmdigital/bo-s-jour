<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            if (!Schema::hasColumn('accommodations', 'whatsapp')) {
                // WhatsApp officiel de l'établissement (brief Extranet Partenaire, Étape 8) —
                // distinct du WhatsApp personnel de l'hôte (users.whatsapp), utilisé par l'API
                // WhatsApp pour les confirmations de réservation liées à cet établissement.
                $table->string('whatsapp')->nullable()->after('name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn('whatsapp');
        });
    }
};
