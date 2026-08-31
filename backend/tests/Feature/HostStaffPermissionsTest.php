<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Vérifie que les permissions d'un collaborateur hôte (host_staff.permissions /
 * users.staff_permissions, cases à cocher de l'Extranet Partenaire, Phase 13) sont
 * réellement appliquées côté serveur — pas seulement filtrées côté menu (HostSidebar.tsx).
 *
 * Audit sécurité 2026-08-31 : jusqu'ici, un collaborateur invité pour un seul poste
 * (ex. "ménage") pouvait appeler n'importe quel endpoint host directement via l'API.
 */
class HostStaffPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private function makeOwner(): User
    {
        return User::factory()->create(['role' => 'host']);
    }

    private function makeStaff(User $owner, array $permissions): User
    {
        return User::factory()->create([
            'role' => 'host',
            'staff_owner_id' => $owner->id,
            'staff_role' => 'receptionniste',
            'staff_permissions' => $permissions,
        ]);
    }

    public function test_owner_has_full_access_regardless_of_any_permission_list(): void
    {
        $owner = $this->makeOwner();
        Accommodation::factory()->for($owner, 'host')->create();

        Sanctum::actingAs($owner);

        $this->getJson('/api/accommodations/my')->assertOk();
        $this->getJson('/api/host/reviews')->assertOk();
        $this->getJson('/api/host/clients')->assertOk();
        $this->getJson('/api/host/profile')->assertOk();
        $this->getJson('/api/host/withdrawal-requests/balance')->assertOk();
    }

    public function test_staff_with_permission_can_access_the_matching_module(): void
    {
        $owner = $this->makeOwner();
        $staff = $this->makeStaff($owner, ['property', 'clients']);

        Sanctum::actingAs($staff);

        $this->getJson('/api/accommodations/my')->assertOk();
        $this->getJson('/api/host/clients')->assertOk();
    }

    public function test_staff_without_permission_is_blocked_from_the_module(): void
    {
        $owner = $this->makeOwner();
        $staff = $this->makeStaff($owner, ['clients']); // pas 'property', pas 'reviews'

        Sanctum::actingAs($staff);

        $this->getJson('/api/accommodations/my')->assertForbidden();
        $this->getJson('/api/host/reviews')->assertForbidden();
    }

    public function test_staff_is_always_blocked_from_profile_and_withdrawals_even_with_administrateur_role(): void
    {
        $owner = $this->makeOwner();
        // Même un collaborateur "Administrateur" avec toutes les permissions cochées ne
        // doit jamais accéder aux coordonnées bancaires ni aux retraits (voir
        // HostProfileController / HostWithdrawalController::assertOwnerOnly()).
        $staff = User::factory()->create([
            'role' => 'host',
            'staff_owner_id' => $owner->id,
            'staff_role' => 'administrateur',
            'staff_permissions' => \App\Models\HostStaff::PERMISSIONS,
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/host/profile')->assertForbidden();
        $this->postJson('/api/host/profile', [])->assertForbidden();
        $this->getJson('/api/host/withdrawal-requests/balance')->assertForbidden();
        $this->getJson('/api/host/withdrawal-requests')->assertForbidden();
        $this->postJson('/api/host/withdrawal-requests', ['amount' => 5000])->assertForbidden();
    }

    public function test_inbox_is_accessible_to_any_staff_regardless_of_permissions(): void
    {
        $owner = $this->makeOwner();
        $staff = $this->makeStaff($owner, []); // aucune permission cochée

        Sanctum::actingAs($staff);

        $this->getJson('/api/host/inbox')->assertOk();
    }

    public function test_reservations_permission_gates_checkin_and_overview(): void
    {
        $owner = $this->makeOwner();
        $withoutPermission = $this->makeStaff($owner, ['property']);
        $withPermission = $this->makeStaff($owner, ['reservations']);

        Sanctum::actingAs($withoutPermission);
        $this->getJson('/api/bookings/host/overview')->assertForbidden();

        Sanctum::actingAs($withPermission);
        $this->getJson('/api/bookings/host/overview')->assertOk();
    }
}
