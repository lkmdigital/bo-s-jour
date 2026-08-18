<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Historique des campagnes marketing envoyées (module Commercialisation) —
     * segment ciblé (filtres au moment de l'envoi), contenu, résultat.
     */
    public function up(): void
    {
        if (!Schema::hasTable('marketing_campaigns')) {
            Schema::create('marketing_campaigns', function (Blueprint $table) {
                $table->id();
                $table->string('title', 191);
                $table->text('body');
                $table->string('url', 500)->nullable();
                $table->json('filters')->nullable();
                $table->unsignedInteger('recipients_count')->default(0);
                $table->enum('status', ['sent', 'failed'])->default('sent');
                $table->text('error')->nullable();
                $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaigns');
    }
};
