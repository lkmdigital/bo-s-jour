<?php

namespace Tests\Unit;

use App\Models\Accommodation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.2) : "ID Établissement : format
 * recommandé à valider : BS-VILLE-XXX, par exemple BS-KGO-00O1." Confirmé
 * avec l'utilisateur : adopté pour les nouveaux établissements — les codes
 * déjà attribués (ancien format Code pays-Séquence-Année) restent
 * inchangés, jamais renumérotés.
 */
class EstablishmentCodeFormatTest extends TestCase
{
    use RefreshDatabase;

    public function test_generated_code_matches_bs_city_four_digits_format(): void
    {
        $code = Accommodation::generateEstablishmentCode('Korhogo');

        $this->assertMatchesRegularExpression('/^BS-[A-Z]{3}-\d{4}$/', $code);
        $this->assertStringStartsWith('BS-KOR-', $code);
    }

    public function test_sequence_increments_within_the_same_city(): void
    {
        $first = Accommodation::generateEstablishmentCode('Abidjan');
        Accommodation::factory()->create(['establishment_code' => $first]);
        $second = Accommodation::generateEstablishmentCode('Abidjan');

        $this->assertSame('BS-ABI-0001', $first);
        $this->assertSame('BS-ABI-0002', $second);
    }

    public function test_sequence_is_independent_per_city(): void
    {
        $abidjan = Accommodation::generateEstablishmentCode('Abidjan');
        Accommodation::factory()->create(['establishment_code' => $abidjan]);

        $korhogo = Accommodation::generateEstablishmentCode('Korhogo');

        $this->assertSame('BS-ABI-0001', $abidjan);
        $this->assertSame('BS-KOR-0001', $korhogo);
    }

    public function test_accented_city_names_are_transliterated(): void
    {
        $code = Accommodation::generateEstablishmentCode('Bouaké');

        $this->assertStringStartsWith('BS-BOU-', $code);
    }

    public function test_existing_legacy_codes_are_never_regenerated_or_reused(): void
    {
        // Ancien format (Code pays-Séquence-Année) — ne doit jamais entrer en
        // collision avec le nouveau format ni être considéré dans la séquence.
        Accommodation::factory()->create(['establishment_code' => '+225-00042-26']);

        $code = Accommodation::generateEstablishmentCode('Abidjan');

        $this->assertSame('BS-ABI-0001', $code);
    }
}
