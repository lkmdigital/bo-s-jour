<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Brief client (Parcours Voyageur) : "Le voyageur reçoit les confirmations
     * (WhatsApp + E-mail) avec le numéro de réservation, le code de confirmation
     * et les détails du séjour." — deux identifiants distincts. `confirmation_code`
     * (existant) reste la clé aléatoire présentée à l'hôte à l'arrivée. Ce nouveau
     * `booking_number` est la référence stable et séquentielle (facturation,
     * support, export compta), format RES-{année}-{séquence 5 chiffres}.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'booking_number')) {
                $table->string('booking_number', 20)->nullable()->unique()->after('confirmation_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'booking_number')) {
                $table->dropColumn('booking_number');
            }
        });
    }
};
