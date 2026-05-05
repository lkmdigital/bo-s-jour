<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accommodation_id')->constrained('accommodations')->onDelete('cascade');
            $table->foreignId('room_id')->nullable()->constrained('rooms')->onDelete('cascade');
            // Si room_id est null, la promotion s'applique à toutes les chambres de l'établissement
            $table->decimal('discount_percent', 5, 2)->default(0); // Pourcentage de réduction (ex: 15.50 pour 15.5%)
            $table->date('start_date');
            $table->date('end_date');
            $table->text('description')->nullable(); // Description de la promotion
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Index pour les recherches fréquentes
            $table->index(['accommodation_id', 'is_active']);
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};







