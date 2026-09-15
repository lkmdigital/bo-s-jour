<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : "assure toi que l'administrateur bosejour depuis
 * son dashboard peut consulter l'état de chaque hote et vérifier ses
 * documents" — la liste agrégée de /dashboard/admin/conformite existait déjà
 * (AdminComplianceController) mais sa fiche détail par hôte
 * (/dashboard/admin/users/{id}, vers laquelle elle renvoie via "Voir")
 * n'affichait que la pièce d'identité, jamais le RCCM, la licence
 * d'exploitation, le document contribuable, ni le WhatsApp/téléphone fixe de
 * l'établissement.
 */
class AdminHostComplianceVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_a_hosts_full_compliance_status_and_documents(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $host = User::factory()->create([
            'role' => 'host',
            'whatsapp' => '+2250700000000',
            'rccm' => 'CI-ABJ-2024-B-1234',
            'rccm_document_path' => 'host-documents/rccm.pdf',
        ]);
        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/admin/users/{$host->id}")->assertOk();

        $response->assertJsonPath('data.compliance_status', 'non_conforme');
        $response->assertJsonPath('data.rccm_document_path', 'host-documents/rccm.pdf');
        $response->assertJsonPath('data.whatsapp', '+2250700000000');
        $response->assertJsonStructure(['data' => ['compliance_requirements']]);
    }

    public function test_compliance_fields_are_not_appended_for_a_non_host_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $traveler = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/admin/users/{$traveler->id}")->assertOk();

        $response->assertJsonMissingPath('data.compliance_status');
        $response->assertJsonMissingPath('data.compliance_requirements');
    }

    public function test_a_fully_compliant_host_shows_conforme(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $host = User::factory()->create([
            'role' => 'host',
            'id_document_path' => 'host-documents/id.pdf',
            'id_number' => 'AB123456',
            'phone_fixed' => '+2252123456',
            'whatsapp' => '+2250700000000',
            'rccm' => 'CI-ABJ-2024-B-1234',
            'tax_account_number' => '1234567A',
            'rccm_document_path' => 'host-documents/rccm.pdf',
            'business_license_path' => 'host-documents/license.pdf',
            'tax_document_path' => 'host-documents/tax.pdf',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/users/{$host->id}")
            ->assertOk()
            ->assertJsonPath('data.compliance_status', 'conforme');
    }
}
