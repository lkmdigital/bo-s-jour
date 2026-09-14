<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-14 : "le formulaire du petit-déjeuner, à quel
 * moment un établissement renseigne ça ?" — jusqu'ici la page d'édition
 * hôte (utilisée après la création) n'avait AUCUN champ dédié au
 * petit-déjeuner (breakfast_included / breakfast_included_persons /
 * breakfast_price), seulement une coche générique "Petit-déjeuner" dans la
 * liste des équipements, sans lien avec ces colonnes. L'endpoint acceptait
 * déjà ces champs (jamais rien à corriger côté API) — ce test verrouille
 * le contrat pour le nouveau formulaire d'édition.
 */
class AccommodationBreakfastSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_can_set_included_breakfast_and_extra_breakfast_price(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create([
            'host_id' => $host->id,
            'breakfast_included' => false,
            'breakfast_included_persons' => 0,
            'breakfast_price' => null,
        ]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", [
            'breakfast_included' => true,
            'breakfast_included_persons' => 2,
            'breakfast_price' => 3500,
        ])->assertOk();

        $fresh = $accommodation->fresh();
        $this->assertTrue($fresh->breakfast_included);
        $this->assertSame(2, $fresh->breakfast_included_persons);
        $this->assertSame('3500.00', $fresh->breakfast_price);
    }

    public function test_host_can_remove_the_extra_breakfast_price(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create([
            'host_id' => $host->id,
            'breakfast_price' => 3000,
        ]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['breakfast_price' => null])->assertOk();

        $this->assertNull($accommodation->fresh()->breakfast_price);
    }
}
