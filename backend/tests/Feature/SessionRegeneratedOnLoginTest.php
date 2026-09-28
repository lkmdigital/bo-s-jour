<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Durci suite à l'audit de sécurité externe (2026-09-27, Phase 2) : l'identifiant de
 * session n'était jamais régénéré à la connexion (risque de fixation de session).
 * Auth::guard('web')->login() est désormais suivi, sur les 7 parcours concernés, de
 * $request->session()->regenerate() — uniquement quand une session existe (appelant
 * "frontend" stateful reconnu par Sanctum), sinon un client Bearer-only planterait.
 */
class SessionRegeneratedOnLoginTest extends TestCase
{
    use RefreshDatabase;

    private function cookieValue(\Illuminate\Testing\TestResponse $response, string $name): ?string
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === $name) {
                return $cookie->getValue();
            }
        }
        return null;
    }

    public function test_the_session_id_changes_after_a_stateful_frontend_login(): void
    {
        Config::set('sanctum.stateful', ['localhost:3000']);
        $cookieName = config('session.cookie');
        $admin = User::factory()->create(['role' => 'admin', 'password' => bcrypt('password123')]);

        $origin = ['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000'];

        // Établit une première session (avant toute authentification).
        $before = $this->withHeaders($origin)->get('/sanctum/csrf-cookie');
        $initialSessionId = $this->cookieValue($before, $cookieName);
        $this->assertNotNull($initialSessionId, "le cookie de session {$cookieName} doit être posé");

        // Réutilise ce même cookie pour la connexion : c'est le scénario de fixation à
        // couvrir (un identifiant connu AVANT l'authentification).
        $after = $this->withHeaders($origin)
            ->withCookie($cookieName, $initialSessionId)
            ->postJson('/api/login', ['email' => $admin->email, 'password' => 'password123']);

        $after->assertOk();
        $newSessionId = $this->cookieValue($after, $cookieName);

        $this->assertNotNull($newSessionId);
        $this->assertNotSame($initialSessionId, $newSessionId, "l'identifiant de session doit changer après la connexion");
    }

    public function test_a_bearer_only_caller_without_a_stateful_origin_can_still_log_in(): void
    {
        // Aucun Origin reconnu par Sanctum : la requête n'est jamais "stateful", donc
        // $request n'a pas de session — regenerate() ne doit pas être appelé (et ne doit
        // surtout pas planter la connexion).
        $admin = User::factory()->create(['role' => 'admin', 'password' => bcrypt('password123')]);

        $response = $this->postJson('/api/login', ['email' => $admin->email, 'password' => 'password123']);

        $response->assertOk();
        $this->assertNotEmpty($response->json('token'));
    }
}
