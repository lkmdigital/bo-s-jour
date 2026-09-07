<?php

namespace Tests\Feature;

use App\Models\LegalDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (orthotypographie) : "bo séjour" -> "BoSéjour".
 * Le contenu CGU/CGV/Confidentialité a été seedé en base par une migration
 * antérieure (guardée sur content IS NULL, donc non-rejouable) — la
 * migration 2026_09_07_000001 corrige le contenu déjà en base par un simple
 * str_replace, sans jamais écraser une édition admin ni toucher aux
 * documents sans contenu.
 */
class LegalDocumentRenameMigrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * RefreshDatabase exécute déjà toutes les migrations (dont celle-ci) au
     * setUp — un second `artisan migrate` la trouverait "déjà jouée" et ne
     * ferait rien. On instancie donc directement la classe de migration et
     * on appelle up() nous-mêmes, pour la rejouer après avoir modifié le
     * contenu.
     */
    private function runMigration(): void
    {
        $migration = require base_path('database/migrations/2026_09_07_000001_rename_bo_sejour_in_legal_documents_content.php');
        $migration->up();
    }

    public function test_migration_renames_bo_sejour_inside_existing_content_without_touching_the_rest(): void
    {
        LegalDocument::where('slug', 'cgu')->update([
            'content' => "Article 1\n\nbo séjour met à disposition sa plateforme. Contact : bo séjour (« bo séjour »).",
        ]);

        $this->runMigration();

        $doc = LegalDocument::where('slug', 'cgu')->first();
        $this->assertSame(
            "Article 1\n\nBoSéjour met à disposition sa plateforme. Contact : BoSéjour (« BoSéjour »).",
            $doc->content
        );
    }

    public function test_migration_is_a_no_op_when_content_already_renamed_or_absent(): void
    {
        LegalDocument::where('slug', 'cgu')->update(['content' => 'Déjà en BoSéjour, rien à faire.']);
        LegalDocument::where('slug', 'cgv')->update(['content' => null]);
        $confidentialiteBefore = LegalDocument::where('slug', 'confidentialite')->first()->content;

        $this->runMigration();

        $this->assertSame('Déjà en BoSéjour, rien à faire.', LegalDocument::where('slug', 'cgu')->first()->content);
        $this->assertNull(LegalDocument::where('slug', 'cgv')->first()->content);
        $this->assertSame($confidentialiteBefore, LegalDocument::where('slug', 'confidentialite')->first()->content);
    }
}
