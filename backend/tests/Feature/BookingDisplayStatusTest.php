<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.4) : statuts de réservation/paiement
 * proposés ("En attente de paiement, Paiement en cours, Confirmée, Annulée,
 * Expirée, No-show, Séjour terminé" / "Non payé, Payé partiellement, Payé
 * intégralement, Échoué, Remboursé partiellement, Remboursé intégralement").
 * Implémentés comme libellés calculés (pas de migration du statut stocké —
 * voir commentaire sur Booking::displayStatusLabel()).
 */
class BookingDisplayStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_booking_without_payment_shows_awaiting_payment(): void
    {
        $booking = Booking::factory()->create(['status' => 'pending', 'payment_status' => 'pending']);
        $this->assertSame('En attente de paiement', $booking->display_status_label);
    }

    public function test_pending_booking_with_pending_payment_shows_payment_in_progress(): void
    {
        $booking = Booking::factory()->create(['status' => 'pending', 'payment_status' => 'pending']);
        Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id,
            'amount' => 10000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-DISPLAY-1',
        ]);
        $this->assertSame('Paiement en cours', $booking->fresh()->display_status_label);
    }

    public function test_expired_pending_booking_shows_expired(): void
    {
        $booking = Booking::factory()->create([
            'status' => 'pending',
            'payment_status' => 'pending',
            'expires_at' => now()->subHour(),
        ]);
        $this->assertSame('Expirée', $booking->display_status_label);
    }

    public function test_no_show_booking_shows_no_show_regardless_of_status(): void
    {
        $booking = Booking::factory()->create(['status' => 'confirmed', 'no_show_at' => now()]);
        $this->assertSame('No-show', $booking->display_status_label);
    }

    public function test_payment_statuses_map_to_documented_labels(): void
    {
        $this->assertSame('Payé intégralement', Booking::factory()->make(['payment_status' => 'paid'])->display_payment_status_label);
        $this->assertSame('Payé partiellement', Booking::factory()->make(['payment_status' => 'guarantee_paid'])->display_payment_status_label);
        $this->assertSame('Échoué', Booking::factory()->make(['payment_status' => 'failed'])->display_payment_status_label);
        $this->assertSame('Non payé', Booking::factory()->make(['payment_status' => 'pending'])->display_payment_status_label);
    }

    public function test_admin_can_filter_reservations_by_payment_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Booking::factory()->create(['payment_status' => 'paid']);
        Booking::factory()->create(['payment_status' => 'pending']);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/bookings?payment_status=paid')->assertOk();
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('paid', $data[0]['payment_status']);
        $this->assertArrayHasKey('display_status_label', $data[0]);
        $this->assertArrayHasKey('display_payment_status_label', $data[0]);
    }
}
