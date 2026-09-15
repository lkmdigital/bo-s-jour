<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-15 : « Meilleures activités à Abidjan » était une
 * liste codée en dur (10 activités inventées) — même correctif que
 * discovery_sites, géré par l'admin désormais.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discovery_activities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Catégories des onglets de filtre (plage/musee/voir/nourriture/vie_nocturne),
            // une activité peut appartenir à plusieurs (même schéma que l'ancien
            // contenu codé en dur — voir ACT_TABS dans sections.tsx).
            $table->json('categories')->nullable();
            // Terme de recherche pré-rempli au clic (/accommodations?search=...).
            $table->string('search_term')->nullable();
            $table->string('image_path');
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discovery_activities');
    }
};
