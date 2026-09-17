<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-17 : bouton "Laissez un avis sur boséjour" sur
 * l'accueil, qui alimente la section témoignages avec de vrais avis
 * (prénom + photo de profil du compte s'il en a une, sinon initiale) —
 * distinct du modèle Review (avis post-séjour, lié à une réservation).
 * Modéré (is_published=false par défaut) avant d'apparaître publiquement,
 * même principe que les autres contenus "Découvertes" déjà en place.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_testimonials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // Copiés au moment de la soumission (pas de jointure live) : un avis
            // publié reste affichable même si l'utilisateur change de nom/photo
            // ou supprime son compte ensuite.
            $table->string('first_name');
            $table->string('avatar_path')->nullable();
            $table->text('comment');
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_testimonials');
    }
};
