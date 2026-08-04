<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Périodes tarifaires par chambre (tarification saisonnière).
     * Permet à l'hôte de programmer un prix par nuit sur une plage de dates
     * (ex: 60 000 FCFA à partir de septembre). Le prix est appliqué
     * automatiquement au calcul des réservations couvrant ces dates.
     */
    public function up(): void
    {
        Schema::create('room_price_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->onDelete('cascade');
            $table->string('label')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('price_per_night', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['room_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_price_periods');
    }
};
