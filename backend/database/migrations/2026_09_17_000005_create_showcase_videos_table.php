<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-17 : la section "Explorez boséjour en mouvement" de
 * l'accueil montrait 3 vignettes vidéo codées en dur (noms de lieux, notes en
 * étoiles inventés, bouton "Lire" qui ne menait à aucune vidéo) — même
 * problème que les autres modules "Découvertes". Le client veut que l'admin
 * puisse ajouter/gérer ces vidéos. Masquée (colonne vidéos, pas toute la
 * section — le bloc héros à gauche reste, lui, basé sur de vraies photos
 * d'hébergements) tant qu'aucune entrée n'est publiée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('showcase_videos', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->unsignedTinyInteger('rating')->default(5);
            $table->string('image_path');
            $table->string('video_url')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('showcase_videos');
    }
};
