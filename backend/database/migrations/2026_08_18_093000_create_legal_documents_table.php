<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Documents juridiques de la plateforme (CGV, CGU, politique de confidentialité),
     * éditables par l'admin — cf. Paramètres > Conditions générales de vente / Juridique.
     */
    public function up(): void
    {
        if (!Schema::hasTable('legal_documents')) {
            Schema::create('legal_documents', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 50)->unique();
                $table->string('title', 191);
                $table->longText('content')->nullable();
                $table->string('version', 20)->default('1.0');
                $table->boolean('is_published')->default(false);
                $table->timestamp('published_at')->nullable();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });

            DB::table('legal_documents')->insert([
                [
                    'slug' => 'cgv',
                    'title' => 'Conditions générales de vente',
                    'content' => null,
                    'version' => '1.0',
                    'is_published' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'cgu',
                    'title' => "Conditions générales d'utilisation",
                    'content' => null,
                    'version' => '1.0',
                    'is_published' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'slug' => 'confidentialite',
                    'title' => 'Politique de confidentialité',
                    'content' => null,
                    'version' => '1.0',
                    'is_published' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_documents');
    }
};
