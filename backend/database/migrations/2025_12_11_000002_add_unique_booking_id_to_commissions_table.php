<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Nettoyer les doublons avant d'ajouter la contrainte unique
        // Garder la commission la plus récente pour chaque réservation
        DB::statement('
            DELETE c1 FROM commissions c1
            INNER JOIN commissions c2 
            WHERE c1.id < c2.id 
            AND c1.booking_id = c2.booking_id
        ');

        // Ajouter la contrainte unique sur booking_id
        Schema::table('commissions', function (Blueprint $table) {
            // Supprimer d'abord la contrainte de clé étrangère
            $table->dropForeign(['booking_id']);
            
            // Supprimer l'index existant s'il existe
            $table->dropIndex(['booking_id']);
            
            // Ajouter un index unique sur booking_id pour garantir une seule commission par réservation
            $table->unique('booking_id', 'commissions_booking_id_unique');
            
            // Recréer la contrainte de clé étrangère
            $table->foreign('booking_id')
                  ->references('id')
                  ->on('bookings')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commissions', function (Blueprint $table) {
            // Supprimer la contrainte de clé étrangère
            $table->dropForeign(['booking_id']);
            
            // Supprimer la contrainte unique
            $table->dropUnique('commissions_booking_id_unique');
            
            // Remettre l'index normal
            $table->index('booking_id');
            
            // Recréer la contrainte de clé étrangère
            $table->foreign('booking_id')
                  ->references('id')
                  ->on('bookings')
                  ->onDelete('cascade');
        });
    }
};






