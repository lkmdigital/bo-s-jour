<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-15 : « Principaux sites à voir » sur l'accueil était
 * une liste d'images Unsplash codée en dur, jamais du vrai contenu — le
 * client veut que ces modules soient basés sur du réel et gérés par
 * l'admin. Remplace le contenu statique de sections.tsx.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discovery_sites', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('city')->nullable();
            $table->string('image_path');
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discovery_sites');
    }
};
