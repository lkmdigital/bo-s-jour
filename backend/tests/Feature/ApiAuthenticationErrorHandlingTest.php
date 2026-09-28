<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Découvert en vérifiant SecureDocumentController (audit sécurité externe, 2026-09-27,
 * Phase 4) : un appelant non authentifié SANS l'en-tête Accept: application/json
 * provoquait un plantage (RouteNotFoundException : route "login" absente d'une API pure)
 * au lieu d'un 401 propre, avec la trace complète exposée tant qu'APP_DEBUG est actif.
 */
class ApiAuthenticationErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_unauthenticated_request_without_the_json_header_still_gets_a_clean_401(): void
    {
        // Un GET "brut" (curl, navigation directe) n'envoie pas Accept: application/json.
        $response = $this->get('/api/me', ['Accept' => '*/*']);

        $response->assertStatus(401);
        $response->assertJson(['message' => 'Non authentifié.']);
    }

    public function test_an_unauthenticated_json_request_still_gets_401_as_before(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }
}
