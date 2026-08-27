<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Publication des CGU/CGV/Confidentialité (brouillon validé par l'utilisateur
 * le 2026-08-27) — décision explicite de publier avant la mise en production.
 * Guard sur is_published=false : ne republie jamais un document qu'un admin
 * aurait entre-temps dépublié volontairement.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('legal_documents')
            ->whereIn('slug', ['cgu', 'cgv', 'confidentialite'])
            ->where('is_published', false)
            ->update([
                'is_published' => true,
                'published_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('legal_documents')
            ->whereIn('slug', ['cgu', 'cgv', 'confidentialite'])
            ->update([
                'is_published' => false,
                'published_at' => null,
            ]);
    }
};
