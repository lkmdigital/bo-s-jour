<?php

namespace Tests\Feature;

use App\Models\HostDocumentType;
use App\Models\Role;
use App\Models\User;
use App\Services\HostProfileCompletion;
use App\Services\PartnerDocuments;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Documents à fournir configurables par l'admin (retour client 2026-11-12). */
class HostDocumentTypesTest extends TestCase
{
    use RefreshDatabase;

    private function fullyCompliantHost(): User
    {
        return User::factory()->host()->create([
            'id_document_path' => 'x/id.pdf', 'id_number' => '123',
            'phone_fixed' => '2720000000', 'whatsapp' => '0700000000',
            'rccm' => 'CI-1', 'tax_account_number' => 'IFU1',
            'rccm_document_path' => 'x/rccm.pdf', 'business_license_path' => 'x/lic.pdf',
            'tax_document_path' => 'x/tax.pdf',
        ]);
    }

    private function superAdmin(): User
    {
        $user = User::factory()->admin()->create();
        $role = Role::where('name', 'super_admin')->first() ?? Role::create(['name' => 'super_admin', 'display_name' => 'Super administrateur']);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_super_admin_can_create_update_and_delete_a_document_type(): void
    {
        Sanctum::actingAs($this->superAdmin());

        $id = $this->postJson('/api/admin/host-document-types', [
            'label' => 'Attestation d\'assurance', 'is_required' => true,
        ])->assertCreated()->json('data.id');

        $this->putJson("/api/admin/host-document-types/{$id}", ['is_required' => false])
            ->assertOk()->assertJsonPath('data.is_required', false);

        $this->getJson('/api/admin/host-document-types')->assertOk()
            ->assertJsonFragment(['label' => 'Attestation d\'assurance']);

        $this->deleteJson("/api/admin/host-document-types/{$id}")->assertOk();
        $this->assertSoftDeleted('host_document_types', ['id' => $id]);
    }

    public function test_a_plain_admin_can_read_but_not_change_the_document_types(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/admin/host-document-types')->assertOk()->assertJsonPath('can_change', false);
        $this->postJson('/api/admin/host-document-types', ['label' => 'X'])->assertForbidden();
        $type = HostDocumentType::where('key', 'tax_document')->first();
        $this->putJson("/api/admin/host-document-types/{$type->id}", ['is_required' => false])->assertForbidden();
        $this->deleteJson("/api/admin/host-document-types/{$type->id}")->assertForbidden();
        $this->assertTrue($type->fresh()->is_required);
    }

    public function test_non_admin_cannot_manage_document_types(): void
    {
        Sanctum::actingAs(User::factory()->host()->create());

        $this->getJson('/api/admin/host-document-types')->assertForbidden();
        $this->postJson('/api/admin/host-document-types', ['label' => 'X'])->assertForbidden();
    }

    public function test_only_required_documents_weigh_on_compliance(): void
    {
        $host = $this->fullyCompliantHost();
        $this->assertSame('conforme', $host->compliance_status);

        $type = HostDocumentType::create(['key' => 'assurance', 'label' => 'Assurance', 'is_required' => false]);
        $this->assertSame('conforme', $host->fresh()->compliance_status);

        $type->update(['is_required' => true]);
        $this->assertSame('non_conforme', $host->fresh()->compliance_status);

        $type->delete();
        $this->assertSame('conforme', $host->fresh()->compliance_status);
    }

    public function test_marking_a_legacy_document_optional_unblocks_the_host(): void
    {
        $host = $this->fullyCompliantHost();
        $host->update(['tax_document_path' => null]);
        $this->assertSame('non_conforme', $host->fresh()->compliance_status);

        HostDocumentType::where('key', 'tax_document')->update(['is_required' => false]);
        \Illuminate\Support\Facades\Cache::flush();

        $this->assertSame('conforme', $host->fresh()->compliance_status);
    }

    public function test_host_uploads_a_custom_document_and_becomes_compliant(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $host = $this->fullyCompliantHost();
        $type = HostDocumentType::create(['key' => 'assurance', 'label' => 'Assurance', 'is_required' => true]);
        $this->assertSame('non_conforme', $host->fresh()->compliance_status);

        Sanctum::actingAs($host);
        $this->postJson("/api/host/documents/{$type->id}", [
            'file' => UploadedFile::fake()->create('assurance.pdf', 100, 'application/pdf'),
        ])->assertOk()->assertJsonPath('compliance_status', 'conforme');

        $this->getJson('/api/host/documents')->assertOk()
            ->assertJsonFragment(['key' => 'assurance', 'provided' => true, 'is_required' => true]);

        // Fichier confidentiel : disque privé, jamais le disque public.
        $path = $host->hostDocuments()->first()->path;
        Storage::disk('local')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_custom_document_is_served_only_to_its_owner_and_admins(): void
    {
        Storage::fake('local');
        $host = $this->fullyCompliantHost();
        $type = HostDocumentType::create(['key' => 'assurance', 'label' => 'Assurance', 'is_required' => true]);
        Sanctum::actingAs($host);
        $this->postJson("/api/host/documents/{$type->id}", [
            'file' => UploadedFile::fake()->create('assurance.pdf', 100, 'application/pdf'),
        ])->assertOk();

        $url = "/api/documents/{$host->id}/custom/{$type->id}";
        $this->get($url)->assertOk();                                   // le propriétaire

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->get($url)->assertOk();                                   // un admin

        Sanctum::actingAs(User::factory()->host()->create());
        $this->get($url)->assertForbidden();                            // un autre partenaire

        $type->delete();                                                // type retiré : le fichier reste consultable
        Sanctum::actingAs($host);
        $this->get($url)->assertOk();
    }

    public function test_a_required_document_holds_the_profile_below_100_percent_until_provided(): void
    {
        Storage::fake('local');
        $host = User::factory()->host()->create([
            'phone' => '0701020304', 'date_of_birth' => '1985-04-12', 'bio' => 'Hôtelier.',
            'address_line1' => 'Quartier', 'city' => 'Korhogo', 'country' => 'Côte d\'Ivoire',
            'phone_fixed' => '2722000000', 'whatsapp' => '0701020304',
            'rccm' => 'CI-1', 'tax_account_number' => 'IFU1', 'id_type' => 'Passeport', 'id_number' => '123',
            'id_document_path' => 'x/id.pdf', 'rccm_document_path' => 'x/r.pdf',
            'business_license_path' => 'x/l.pdf', 'tax_document_path' => 'x/t.pdf',
        ]);
        $this->assertSame(100, HostProfileCompletion::percentage($host, true));

        // Un document facultatif ne pèse pas ; un document obligatoire manquant empêche les 100 %.
        $optional = HostDocumentType::create(['key' => 'assurance', 'label' => 'Assurance', 'is_required' => false]);
        $this->assertSame(100, HostProfileCompletion::percentage($host->fresh(), true));
        $optional->update(['is_required' => true]);
        $this->assertLessThan(100, HostProfileCompletion::percentage($host->fresh(), true));

        // Un document obligatoire de moins dans la liste : plus rien ne manque.
        HostDocumentType::where('key', 'tax_document')->update(['is_required' => false]);
        $host->update(['tax_document_path' => null]);
        $optional->delete();
        $this->assertSame(100, HostProfileCompletion::percentage($host->fresh(), true));
    }

    public function test_the_global_switch_stays_the_master_for_adding_an_establishment(): void
    {
        $establishment = [
            'name' => 'Résidence Test', 'type' => 'hotel', 'description' => 'Un bel établissement pour les tests.',
            'address' => 'Rue test', 'city' => 'Abidjan', 'latitude' => 5.3364, 'longitude' => -4.0267,
            'price_per_night' => 25000, 'max_guests' => 4, 'bedrooms' => 2, 'bathrooms' => 1,
        ];
        $host = User::factory()->host()->create([
            'phone' => '0701020304', 'date_of_birth' => '1985-04-12', 'bio' => 'Hôtelier.',
            'address_line1' => 'Quartier', 'city' => 'Korhogo', 'country' => 'Côte d\'Ivoire',
            'phone_fixed' => '2722000000', 'whatsapp' => '0701020304',
            'profile_completed' => false, 'profile_verified' => false,
        ]);
        HostDocumentType::create(['key' => 'assurance', 'label' => 'Assurance', 'is_required' => true]);
        Sanctum::actingAs($host);

        // Interrupteur sur « facultatifs » : un document coché obligatoire ne bloque personne.
        $this->assertFalse(PartnerDocuments::required());
        $this->postJson('/api/accommodations', $establishment)->assertCreated();

        // Interrupteur sur « obligatoires » : le profil doit être complet, documents cochés compris.
        PartnerDocuments::setRequired(true, User::factory()->admin()->create());
        $this->postJson('/api/accommodations', $establishment)->assertStatus(403)->assertJsonPath('profile_completion_required', true);
    }

    public function test_host_cannot_upload_to_a_legacy_type_through_the_custom_endpoint(): void
    {
        Sanctum::actingAs($this->fullyCompliantHost());
        $legacy = HostDocumentType::where('key', 'tax_document')->first();

        $this->postJson("/api/host/documents/{$legacy->id}", [
            'file' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf'),
        ])->assertNotFound();
    }
}
