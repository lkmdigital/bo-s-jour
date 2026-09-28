<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Documents d'identité/conformité déplacés du disque public au disque privé "local"
 * (audit de sécurité externe, 2026-09-27, Phase 6) : leur confidentialité reposait
 * entièrement sur le secret du nom de fichier aléatoire. Vérifie qu'ils ne sont plus
 * accessibles sans authentification, et uniquement à leur propriétaire ou à un admin.
 */
class SecureDocumentAccessTest extends TestCase
{
    use RefreshDatabase;

    private function userWithDocument(): User
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $path = UploadedFile::fake()->image('cni.png')->store('user-documents', 'local');
        $user->update(['id_document_recto_path' => $path]);
        return $user;
    }

    public function test_the_document_is_never_written_to_the_public_disk(): void
    {
        $user = $this->userWithDocument();

        // Le disque "public" est servi tel quel par Nginx en production (voir /storage/...) :
        // le fichier ne doit exister que sur le disque privé "local", jamais là.
        Storage::fake('public');
        $this->assertFalse(Storage::disk('public')->exists($user->id_document_recto_path));
        $this->assertTrue(Storage::disk('local')->exists($user->id_document_recto_path));
    }

    public function test_an_anonymous_caller_cannot_view_the_document(): void
    {
        $user = $this->userWithDocument();

        $this->getJson("/api/documents/{$user->id}/id-document-recto")->assertUnauthorized();
    }

    public function test_a_different_traveler_cannot_view_someone_elses_document(): void
    {
        $user = $this->userWithDocument();
        $other = User::factory()->create();

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/documents/{$user->id}/id-document-recto")
            ->assertForbidden();
    }

    public function test_the_owner_can_view_their_own_document(): void
    {
        $user = $this->userWithDocument();

        $this->actingAs($user, 'sanctum')
            ->get("/api/documents/{$user->id}/id-document-recto")
            ->assertOk();
    }

    public function test_an_admin_can_view_any_users_document(): void
    {
        $user = $this->userWithDocument();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->get("/api/documents/{$user->id}/id-document-recto")
            ->assertOk();
    }

    public function test_an_unknown_field_slug_is_refused(): void
    {
        $user = $this->userWithDocument();

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/documents/{$user->id}/bank-account-number")
            ->assertNotFound();
    }
}
