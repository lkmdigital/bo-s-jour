<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpsLogsTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_logs_page_requires_admin_authentication(): void
    {
        $this->get('/ops/logs')->assertRedirect('/ops/login');

        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user, 'web')->get('/ops/logs')->assertRedirect('/ops/login');
    }

    public function test_admin_can_view_the_logs_page(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'web')->get('/ops/logs')->assertOk()->assertSee('Flux de logs');
    }

    public function test_tail_endpoint_returns_translated_entries_and_a_cursor(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $path = storage_path('logs/laravel.log');
        $original = is_file($path) ? file_get_contents($path) : null;

        file_put_contents($path, "[2026-09-28 10:24:37] testing.INFO: Paiement confirmé (source: webhook_verifie) {\"payment_id\":42}\n");

        try {
            $response = $this->actingAs($admin, 'web')->getJson('/ops/logs/tail?source=app');

            $response->assertOk();
            $response->assertJsonPath('entries.0.title', 'Paiement confirmé (source: webhook_verifie)');
            $response->assertJsonPath('entries.0.category', 'Paiement');
            $this->assertIsInt($response->json('cursor'));
        } finally {
            $original === null ? @unlink($path) : file_put_contents($path, $original);
        }
    }

    public function test_tail_endpoint_is_forbidden_to_non_admins(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->actingAs($user, 'web')->getJson('/ops/logs/tail')->assertRedirect('/ops/login');
    }
}
