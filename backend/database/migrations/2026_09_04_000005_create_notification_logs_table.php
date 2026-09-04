<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Retour client 2026-09-02 (Partie 4.3) : "événements de notification" —
// aucune trace de quels e-mails/WhatsApp/SMS ont réellement été envoyés (ou
// ont échoué) pour une réservation n'existait auparavant, seulement les
// logs applicatifs (fichier laravel.log, non consultable depuis l'Extranet).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->string('event'); // booking_confirmed, booking_cancelled...
            $table->string('channel'); // email, sms, whatsapp, push
            $table->string('recipient_type'); // traveler, host
            $table->string('recipient')->nullable(); // e-mail ou numéro, pour audit
            $table->boolean('success')->default(true);
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['booking_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
