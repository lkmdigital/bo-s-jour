<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Constaté en production le 2026-11-11 : le bouton « Payer » du modèle WhatsApp envoyait des liens /paiement/{{1}}<jeton> ; la page de
 * paiement demandait donc « {{1}}<jeton> » à l'API, qui répondait « introuvable ». Le jeton reste reconnu avec ce préfixe.
 */
class BookingRefPlaceholderTest extends TestCase
{
    use RefreshDatabase;

    private function booking(): Booking
    {
        return Booking::factory()->for(User::factory()->create(['role' => 'user']))->create([
            'accommodation_id' => Accommodation::factory()->create(['status' => 'published'])->id,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);
    }

    public function test_the_token_is_found_even_with_the_whatsapp_placeholder_in_front(): void
    {
        $booking = $this->booking();
        $token = $booking->access_token;

        foreach (['', '{{1}}', rawurlencode('{{1}}'), rawurlencode(rawurlencode('{{1}}'))] as $prefix) {
            $this->getJson('/api/bookings/' . $prefix . $token)->assertOk()->assertJsonPath('id', $booking->id);
        }
    }

    public function test_an_unknown_token_is_still_not_found(): void
    {
        $this->booking();

        $this->getJson('/api/bookings/{{1}}' . str_repeat('x', 48))->assertStatus(404);
        $this->getJson('/api/bookings/{{1}}')->assertStatus(404);
    }

    public function test_payment_can_be_started_from_a_link_with_the_placeholder(): void
    {
        $booking = $this->booking();

        // La route de paiement retrouve la réservation (et ne répond plus « introuvable ») : les règles métier suivantes s'appliquent ensuite.
        $response = $this->postJson('/api/bookings/{{1}}' . $booking->access_token . '/payment/initiate', ['payment_method' => 'wave-ci', 'payment_type' => 'full']);

        $this->assertNotSame('Réservation introuvable.', $response->json('message'));
    }
}
