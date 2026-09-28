<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Durci suite à l'audit de sécurité externe (2026-09-27, Phase 8) : cette route
 * n'exigeait auparavant que d'être connecté (auth:sanctum), la restriction réelle
 * (admin/contrôleur) n'étant vérifiée qu'à l'intérieur d'InspectionController —
 * jamais exploitable en pratique, mais fragile en cas de modification future du
 * contrôleur. Vérifie que la route porte désormais elle-même la permission.
 */
class InspectionAccommodationsPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_plain_traveler_cannot_access_the_inspections_accommodations_list(): void
    {
        $this->seed(RolePermissionSeeder::class);
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/admin/inspections/accommodations')->assertForbidden();
    }

    public function test_a_controleur_can_access_the_inspections_accommodations_list(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['role' => 'user']);
        $user->roles()->attach(Role::where('name', 'controleur')->firstOrFail()->id, ['assigned_at' => now()]);

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/inspections/accommodations')->assertOk();
    }

    public function test_an_admin_can_access_the_inspections_accommodations_list(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/inspections/accommodations')->assertOk();
    }
}
