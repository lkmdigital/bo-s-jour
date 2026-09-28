<?php

namespace Tests\Feature;

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Vérifié pendant l'audit de sécurité externe (2026-09-27, Phase 4 — erreurs et
 * divulgation d'informations) : un appelant anonyme consultant /api/bookings/{id}
 * avec l'identifiant numérique brut (pas de jeton) reçoit un 404 propre —
 * Booking::findByRef() refuse déjà la recherche par id numérique sans utilisateur
 * authentifié. BookingController::show() a quand même été durci (garde explicite
 * sur $user null avant les vérifications de rôle) en défense en profondeur, au cas
 * où cette garde de findByRef() changerait un jour sans que ce fichier soit revu.
 */
class BookingAnonymousNumericIdAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_anonymous_request_with_a_raw_numeric_id_is_refused_cleanly(): void
    {
        $booking = Booking::factory()->create();

        $response = $this->getJson("/api/bookings/{$booking->id}");

        $response->assertNotFound();
    }

    public function test_anonymous_request_with_the_real_access_token_still_works(): void
    {
        $booking = Booking::factory()->create();

        $this->getJson("/api/bookings/{$booking->access_token}")->assertOk();
    }
}
