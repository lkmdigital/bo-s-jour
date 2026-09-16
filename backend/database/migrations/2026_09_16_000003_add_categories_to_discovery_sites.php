<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retour client 2026-09-16 (correction "Les destinations tendances") :
 * les sites à voir doivent aussi pouvoir être filtrés par catégorie de
 * voyage (business/balnéaire/tourisme et culture/escapade weekend), même
 * schéma que discovery_activities.categories (JSON, une valeur possible de
 * plusieurs). Le module reste masqué (is_published=false par défaut) tant
 * qu'aucun contenu n'est publié depuis le dashboard admin — cette migration
 * ne change rien à l'affichage tant qu'il n'y a rien à afficher.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discovery_sites', function (Blueprint $table) {
            $table->json('categories')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('discovery_sites', function (Blueprint $table) {
            $table->dropColumn('categories');
        });
    }
};
