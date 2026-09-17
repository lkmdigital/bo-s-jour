<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-17 : « Destinations tendances » sur l'accueil
 * agrégeait automatiquement les vraies villes des établissements
 * (/accommodations/top-cities), ce qui rendait ses onglets de catégorie
 * (Business/Balnéaires/...) purement décoratifs — aucune notion de
 * catégorie n'existe sur une ville agrégée. Le client veut que l'admin
 * puisse gérer directement les destinations affichées ici (ajouter,
 * modifier, supprimer) et leur assigner des catégories, même principe que
 * discovery_sites (« Principaux sites à voir »). Masquée tant qu'aucune
 * entrée n'est publiée (is_published=false par défaut) — cette migration
 * ne change rien à l'affichage tant qu'il n'y a rien à publier.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trending_destinations', function (Blueprint $table) {
            $table->id();
            $table->string('city');
            $table->string('image_path');
            $table->unsignedInteger('from_price');
            $table->unsignedInteger('accommodations_count')->default(0);
            $table->json('categories')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trending_destinations');
    }
};
