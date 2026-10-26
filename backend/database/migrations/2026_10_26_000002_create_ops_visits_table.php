<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fréquentation du site (suivi interne, sans cookie ni donnée personnelle) : une ligne par page vue.
 * Le visiteur n'est identifié que par une empreinte qui change chaque jour (voir VisitRecorder).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ops_visits', function (Blueprint $table) {
            $table->id();
            $table->date('day');
            $table->timestamp('visited_at')->useCurrent();
            $table->string('visitor', 32);
            $table->string('path', 191);
            $table->string('referrer', 120)->nullable();
            $table->string('device', 10);      // mobile | tablet | desktop
            $table->string('browser', 20);
            $table->string('os', 20);
            $table->string('lang', 5)->nullable();
            $table->index(['day', 'visitor']);
            $table->index('visited_at');
            $table->index(['day', 'path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ops_visits');
    }
};
