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
        Schema::create('room_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms')->onDelete('cascade');
            $table->string('image_path'); // Chemin de l'image
            $table->string('thumbnail_path')->nullable(); // Miniature (optionnel)
            $table->boolean('is_primary')->default(false); // Image principale
            $table->integer('sort_order')->default(0); // Ordre d'affichage
            $table->string('caption')->nullable(); // Légende de l'image
            $table->string('caption_en')->nullable(); // Légende en anglais
            $table->timestamps();

            // Index pour les requêtes fréquentes
            $table->index(['room_id', 'is_primary']);
            $table->index(['room_id', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_images');
    }
};
