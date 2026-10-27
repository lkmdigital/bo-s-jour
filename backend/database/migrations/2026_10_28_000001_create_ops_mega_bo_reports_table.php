<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rapport quotidien de Mega Bo, l'assistant IA de l'espace Ops : un seul par jour, conservé pour être relu.
        Schema::create('ops_mega_bo_reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_date')->unique();
            $table->string('headline', 160);
            $table->string('summary', 400);   // version courte, pour WhatsApp
            $table->longText('body');         // rapport complet (Markdown)
            $table->json('snapshot')->nullable(); // chiffres transmis à l'IA, pour vérifier ce qu'elle a affirmé
            $table->string('model', 80)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ops_mega_bo_reports');
    }
};
