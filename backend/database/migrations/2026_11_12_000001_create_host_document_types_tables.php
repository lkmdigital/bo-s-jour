<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('host_document_types', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->unique();
            $table->string('label', 150);
            $table->string('description', 255)->nullable();
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            // Colonne de users où vit déjà le fichier pour les 5 types historiques ;
            // null pour un type créé par l'admin (fichier dans host_documents).
            $table->string('legacy_column', 80)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('host_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('host_document_type_id')->constrained('host_document_types')->cascadeOnDelete();
            $table->string('path');
            $table->timestamps();
            $table->unique(['user_id', 'host_document_type_id']);
        });

        // Les types historiques reprennent exactement l'exigence en vigueur
        // (3 obligatoires + licence d'exploitation, qui était déjà exigée par
        // User::getComplianceRequirementsAttribute) ; le justificatif de domicile
        // n'était pas exigé pour la conformité, il démarre donc en facultatif.
        $now = now();
        $rows = [
            ['manager_id_document', 'Pièce du gérant', true, 'id_document_path', 10],
            ['rccm_document', 'Document RCCM', true, 'rccm_document_path', 20],
            ['operating_license_document', 'Licence d\'exploitation', true, 'business_license_path', 30],
            ['tax_document', 'Document contribuable (IFU)', true, 'tax_document_path', 40],
            ['proof_of_address', 'Justificatif de domicile', false, 'proof_of_address_path', 50],
        ];
        foreach ($rows as [$key, $label, $required, $column, $order]) {
            DB::table('host_document_types')->insert([
                'key' => $key,
                'label' => $label,
                'is_required' => $required,
                'is_active' => true,
                'sort_order' => $order,
                'legacy_column' => $column,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('host_documents');
        Schema::dropIfExists('host_document_types');
    }
};
