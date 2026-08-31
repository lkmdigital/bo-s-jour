<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

/**
 * Migration localStorage -> cookie httpOnly (audit sécurité, 2026-08-31) : vérifie que
 * l'authentification par cookie de session (Sanctum stateful) fonctionne réellement pour
 * une requête "frontend" (Origin/Referer reconnu), et reste inchangée pour un appelant
 * classique (token Bearer, ex. un futur client mobile).
 *
 * Découverte en testant cette migration en conditions réelles (navigateur) : une valeur
 * SANCTUM_STATEFUL_DOMAINS présente mais VIDE dans .env écrase silencieusement la valeur
 * par défaut de config/sanctum.php (env() ne retombe sur le défaut que si la variable est
 * totalement absente, pas si elle est vide) — la session ne se posait alors jamais, sans
 * aucune erreur visible. Le test ci-dessous @stateful_domain_recognizes_frontend_origin
 * garde spécifiquement contre une régression de ce type.
 */
class CookieSessionAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_stateful_domain_recognizes_frontend_origin(): void
    {
        Config::set('sanctum.stateful', ['localhost:3000']);

        $request = \Illuminate\Http\Request::create('/api/login', 'POST');
        $request->headers->set('Origin', 'http://localhost:3000');

        $this->assertTrue(
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::fromFrontend($request)
        );
    }

    public function test_stateful_domain_rejects_unrecognized_origin(): void
    {
        Config::set('sanctum.stateful', ['localhost:3000']);

        $request = \Illuminate\Http\Request::create('/api/login', 'POST');
        $request->headers->set('Origin', 'https://attacker.example');

        $this->assertFalse(
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::fromFrontend($request)
        );
    }

    public function test_login_from_a_stateful_origin_sets_a_session_cookie(): void
    {
        Config::set('sanctum.stateful', ['localhost:3000']);

        $user = User::factory()->create(['role' => 'user']);
        $user->password = bcrypt('password123');
        $user->email_verified_at = now();
        $user->save();

        $response = $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'password123',
            ]);

        $response->assertOk();
        // Auth::guard('web')->login() doit avoir posé le cookie de session Laravel — sans le
        // correctif ("Auth::login()" bare, qui cible le guard par défaut 'sanctum' dépourvu
        // de méthode login()), cette requête aurait renvoyé une 500 avant même d'atteindre ici.
        $this->assertNotNull($response->headers->getCookies());
        $sessionCookieName = config('session.cookie');
        $hasSessionCookie = collect($response->headers->getCookies())
            ->contains(fn ($cookie) => $cookie->getName() === $sessionCookieName);
        $this->assertTrue($hasSessionCookie, 'Le cookie de session Laravel devrait être posé après login().');
    }

    public function test_logout_does_not_crash_when_authenticated_via_session_cookie(): void
    {
        Config::set('sanctum.stateful', ['localhost:3000']);

        $user = User::factory()->create(['role' => 'user']);
        $user->password = bcrypt('password123');
        $user->email_verified_at = now();
        $user->save();

        // Connexion réelle par cookie de session (comme le ferait le frontend), pour que la
        // requête de déconnexion soit authentifiée via un TransientToken (pas de ligne en
        // base) — logout() appelait auparavant currentAccessToken()->delete() sans distinction,
        // ce qui plante sur un TransientToken (pas de méthode delete()).
        $loginResponse = $this->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'password123',
            ]);
        $loginResponse->assertOk();

        $sessionCookieName = config('session.cookie');
        $sessionCookie = collect($loginResponse->headers->getCookies())
            ->first(fn ($cookie) => $cookie->getName() === $sessionCookieName);
        $this->assertNotNull($sessionCookie, 'Le login précédent devrait avoir posé un cookie de session.');

        $response = $this->withHeader('Origin', 'http://localhost:3000')
            ->withCookie($sessionCookieName, $sessionCookie->getValue())
            ->postJson('/api/logout');

        $response->assertOk();
        $response->assertJson(['message' => 'Logged out successfully']);
    }
}
