<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-18 : "on doit pouvoir liker les avis sur les
 * établissements" — même principe que testimonial_reactions (J'aime / Je
 * n'aime pas, un seul des deux par utilisateur et par avis), appliqué cette
 * fois aux avis post-séjour (Review), affichés sur /avis-clients.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['like', 'dislike']);
            $table->timestamps();
            $table->unique(['review_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_reactions');
    }
};
