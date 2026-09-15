<?php

namespace Tests\Feature;

use App\Models\DiscoveryActivity;
use App\Models\DiscoverySite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : « Principaux sites à voir » et « Meilleures
 * activités à Abidjan » étaient du contenu inventé (photos Unsplash, noms de
 * lieux codés en dur) — masqués côté public tant qu'aucune entrée n'est
 * publiée, et désormais gérés par l'admin (voir AdminDiscoveryController /
 * DiscoveryController).
 */
class AdminDiscoveryContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_public_endpoint_only_returns_published_sites(): void
    {
        DiscoverySite::create(['name' => 'Grand-Bassam', 'image_path' => '/storage/discovery/sites/a.jpg', 'is_published' => true]);
        DiscoverySite::create(['name' => 'Man', 'image_path' => '/storage/discovery/sites/b.jpg', 'is_published' => false]);

        $response = $this->getJson('/api/discovery/sites')->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Grand-Bassam', $response->json('data.0.name'));
    }

    public function test_public_endpoint_returns_empty_array_when_nothing_published(): void
    {
        DiscoverySite::create(['name' => 'Man', 'image_path' => '/storage/discovery/sites/b.jpg', 'is_published' => false]);

        $this->getJson('/api/discovery/sites')->assertOk()->assertJson(['data' => []]);
    }

    public function test_a_non_admin_cannot_manage_discovery_sites(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/admin/discovery/sites')->assertStatus(403);
    }

    public function test_admin_can_create_a_discovery_site_with_an_image(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/discovery/sites', [
            'name' => 'Assinie',
            'city' => 'Assinie',
            'is_published' => true,
            'image' => UploadedFile::fake()->image('assinie.jpg'),
        ])->assertCreated();

        $this->assertDatabaseHas('discovery_sites', ['name' => 'Assinie', 'is_published' => true]);
        $path = str_replace('/storage/', '', $response->json('data.image_path'));
        Storage::disk('public')->assertExists($path);
    }

    public function test_admin_can_publish_a_site_without_reuploading_the_image(): void
    {
        $site = DiscoverySite::create(['name' => 'Man', 'image_path' => '/storage/discovery/sites/b.jpg', 'is_published' => false]);
        Sanctum::actingAs($this->admin());

        $this->postJson("/api/admin/discovery/sites/{$site->id}", ['is_published' => true])->assertOk();

        $this->assertTrue($site->fresh()->is_published);
    }

    public function test_admin_can_delete_a_site_and_its_image(): void
    {
        Sanctum::actingAs($this->admin());
        $created = $this->postJson('/api/admin/discovery/sites', [
            'name' => 'Sassandra',
            'image' => UploadedFile::fake()->image('sassandra.jpg'),
        ])->assertCreated();

        $path = str_replace('/storage/', '', $created->json('data.image_path'));
        Storage::disk('public')->assertExists($path);

        $this->deleteJson("/api/admin/discovery/sites/{$created->json('data.id')}")->assertOk();

        $this->assertDatabaseMissing('discovery_sites', ['id' => $created->json('data.id')]);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_public_endpoint_only_returns_published_activities(): void
    {
        DiscoveryActivity::create(['name' => 'Plage de Grand-Bassam', 'categories' => ['plage'], 'image_path' => '/storage/discovery/activities/a.jpg', 'is_published' => true]);
        DiscoveryActivity::create(['name' => 'Musée', 'categories' => ['musee'], 'image_path' => '/storage/discovery/activities/b.jpg', 'is_published' => false]);

        $response = $this->getJson('/api/discovery/activities')->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame(['plage'], $response->json('data.0.categories'));
    }

    public function test_admin_can_create_an_activity_with_categories(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/discovery/activities', [
            'name' => 'Rue Princesse',
            'categories' => ['nourriture', 'vie_nocturne'],
            'search_term' => 'Yopougon',
            'is_published' => true,
            'image' => UploadedFile::fake()->image('rue.jpg'),
        ])->assertCreated();

        $this->assertSame(['nourriture', 'vie_nocturne'], $response->json('data.categories'));
    }

    public function test_activity_category_must_be_a_known_tab(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/discovery/activities', [
            'name' => 'Test',
            'categories' => ['inconnu'],
            'image' => UploadedFile::fake()->image('t.jpg'),
        ])->assertStatus(422);
    }
}
