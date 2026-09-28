<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MigrateDocumentsToPrivateStorageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    public function test_moves_a_document_from_public_to_private_and_deletes_the_original(): void
    {
        Storage::disk('public')->put('user-documents/abc.png', 'contenu-du-fichier');
        $user = User::factory()->create(['id_document_recto_path' => 'user-documents/abc.png']);

        $this->artisan('documents:migrate-to-private')->assertSuccessful();

        $this->assertFalse(Storage::disk('public')->exists('user-documents/abc.png'));
        $this->assertTrue(Storage::disk('local')->exists('user-documents/abc.png'));
        $this->assertSame('contenu-du-fichier', Storage::disk('local')->get('user-documents/abc.png'));
    }

    public function test_dry_run_does_not_change_anything(): void
    {
        Storage::disk('public')->put('user-documents/abc.png', 'contenu');
        User::factory()->create(['id_document_recto_path' => 'user-documents/abc.png']);

        $this->artisan('documents:migrate-to-private --dry-run')->assertSuccessful();

        $this->assertTrue(Storage::disk('public')->exists('user-documents/abc.png'));
        $this->assertFalse(Storage::disk('local')->exists('user-documents/abc.png'));
    }

    public function test_is_idempotent_when_run_twice(): void
    {
        Storage::disk('public')->put('user-documents/abc.png', 'contenu');
        User::factory()->create(['id_document_recto_path' => 'user-documents/abc.png']);

        $this->artisan('documents:migrate-to-private');
        $this->artisan('documents:migrate-to-private')->assertSuccessful();

        $this->assertTrue(Storage::disk('local')->exists('user-documents/abc.png'));
    }

    public function test_a_user_without_any_document_is_skipped_without_error(): void
    {
        User::factory()->create();

        $this->artisan('documents:migrate-to-private')->assertSuccessful();
    }
}
