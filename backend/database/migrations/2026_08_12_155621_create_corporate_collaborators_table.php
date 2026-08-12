<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('corporate_collaborators', function (Blueprint $table) {
            $table->id();
            // Le voyageur Corporate responsable des voyages de son entreprise (brief Étape 22).
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            // Rempli dès que l'e-mail correspond à un compte existant (ou après inscription).
            $table->foreignId('collaborator_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('email');
            $table->string('name')->nullable();
            $table->decimal('spending_limit', 12, 2)->nullable();
            $table->enum('status', ['invited', 'active', 'suspended'])->default('invited');
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->unique(['owner_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corporate_collaborators');
    }
};
