<?php

namespace Tests\Feature;

use App\Models\LegalDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client (réunion 2026-09-08, "Envoyer CGU") : remplace le contenu
 * v1.0 des 3 documents légaux par le document contractuel officiel fourni
 * par le client, découpé en CGU/CGV/Politique de confidentialité.
 */
class LegalDocumentsV2MigrationTest extends TestCase
{
    use RefreshDatabase;

    private function runMigration(): void
    {
        $migration = require base_path('database/migrations/2026_09_13_000001_replace_legal_documents_content_with_v2.php');
        $migration->up();
    }

    public function test_all_three_documents_are_updated_to_version_2(): void
    {
        $this->runMigration();

        foreach (['cgu', 'cgv', 'confidentialite'] as $slug) {
            $doc = LegalDocument::where('slug', $slug)->first();
            $this->assertSame('2.0', $doc->version);
            $this->assertNotEmpty($doc->content);
        }
    }

    public function test_content_contains_no_leftover_placeholder_brackets(): void
    {
        $this->runMigration();

        foreach (['cgu', 'cgv', 'confidentialite'] as $slug) {
            $content = LegalDocument::where('slug', $slug)->first()->content;
            $this->assertStringNotContainsString('[', $content, "{$slug} ne doit contenir aucun champ [à compléter] visible publiquement");
        }
    }

    public function test_confidentialite_uses_the_agreed_contact_email_for_data_requests(): void
    {
        $this->runMigration();

        $content = LegalDocument::where('slug', 'confidentialite')->first()->content;
        $this->assertStringContainsString('support@bosejour.ci', $content);
        $this->assertStringContainsString('HCS Consulting', $content);
    }

    public function test_confidentialite_specifies_retention_durations_for_all_five_categories(): void
    {
        $this->runMigration();

        $content = LegalDocument::where('slug', 'confidentialite')->first()->content;
        foreach (['compte utilisateur', 'réservation et facturation', 'prospection commerciale', 'journaux de sécurité', 'comptes partenaires'] as $category) {
            $this->assertStringContainsString($category, $content);
        }
    }

    public function test_each_document_has_a_titre_section_and_matching_article_count(): void
    {
        $this->runMigration();

        $cgu = LegalDocument::where('slug', 'cgu')->first()->content;
        $cgv = LegalDocument::where('slug', 'cgv')->first()->content;
        $pc = LegalDocument::where('slug', 'confidentialite')->first()->content;

        $this->assertMatchesRegularExpression('/^TITRE I — /m', $cgu);
        preg_match_all('/^Article \d+ — /m', $cgu, $m1);
        $this->assertCount(22, $m1[0]);

        $this->assertMatchesRegularExpression('/^TITRE VII — /m', $cgv);
        preg_match_all('/^Article \d+ — /m', $cgv, $m2);
        $this->assertCount(21, $m2[0]);

        $this->assertMatchesRegularExpression('/^TITRE XI — /m', $pc);
        preg_match_all('/^Article \d+ — /m', $pc, $m3);
        $this->assertCount(15, $m3[0]);
    }
}
