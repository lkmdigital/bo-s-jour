<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Une coordonnée hors des bornes géographiques doit être refusée par la validation (422),
 * pas par la base de données (erreur 500). Cas réel du 2026-10-14 : longitude saisie
 * « -67114145 » au lieu de « -6.7114145 ».
 */
class AccommodationCoordinatesValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_creation_rejects_an_out_of_range_longitude_with_a_validation_error(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'host', 'profile_completed' => true, 'profile_verified' => true]));

        $this->postJson('/api/accommodations', ['latitude' => 4.759667, 'longitude' => -67114145])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['longitude'])
            ->assertJsonMissingValidationErrors(['latitude']);
    }

    public function test_admin_creation_rejects_an_out_of_range_latitude_with_a_validation_error(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson('/api/admin/accommodations', ['latitude' => 475.9667, 'longitude' => -6.7114145])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitude'])
            ->assertJsonMissingValidationErrors(['longitude']);
    }
}
