<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-18 : possibilité d'apprécier (ou pas) un avis
 * plateforme, depuis la page "Avis clients". Un like OU un dislike par
 * utilisateur et par avis (contrainte unique), jamais les deux à la fois —
 * cliquer à nouveau sur la même réaction la retire (toggle), cliquer sur
 * l'autre la remplace.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonial_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_testimonial_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['like', 'dislike']);
            $table->timestamps();
            $table->unique(['platform_testimonial_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonial_reactions');
    }
};
