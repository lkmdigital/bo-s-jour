<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fiche ambassadeur : distinguer un scan du QR code d'un clic sur le lien (le QR encode /p/CODE?s=qr), et garder des notes internes.
 * Les visites enregistrées avant cette date n'ont pas de source (« non distinguée »).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referral_partner_clicks', function (Blueprint $table) {
            $table->string('source', 10)->nullable()->after('visitor_hash');
        });
        Schema::table('referral_partners', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('display_name');
        });
    }

    public function down(): void
    {
        Schema::table('referral_partner_clicks', fn (Blueprint $table) => $table->dropColumn('source'));
        Schema::table('referral_partners', fn (Blueprint $table) => $table->dropColumn('notes'));
    }
};
