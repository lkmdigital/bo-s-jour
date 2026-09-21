<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Retour client 2026-09-21 : le lien de consultation d'une réservation (e-mail,
 * WhatsApp, paiement) contenait simplement son numéro séquentiel — n'importe
 * qui pouvait deviner celui des autres. Chaque réservation reçoit un jeton
 * aléatoire, seul secret qui ouvre la page sans connexion.
 * Migration additive : aucune donnée existante n'est modifiée ou supprimée,
 * les réservations déjà en base reçoivent simplement un jeton.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('bookings', 'access_token')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->string('access_token', 64)->nullable()->unique()->after('booking_number');
            });
        }

        DB::table('bookings')->whereNull('access_token')->orderBy('id')->chunkById(200, function ($rows) {
            foreach ($rows as $row) {
                DB::table('bookings')->where('id', $row->id)->update(['access_token' => Str::random(48)]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropUnique(['access_token']);
            $table->dropColumn('access_token');
        });
    }
};
