<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\LoyaltyVoucher;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.3), manques traités le 2026-09-04 :
 * recherche par numéro de réservation/établissement, origine de la remise,
 * droits d'annulation et de confirmation manuelle côté admin.
 */
class AdminBookingActionsTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_admin_can_search_bookings_by_booking_number(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        Booking::factory()->create(['booking_number' => 'BS-2026-000042']);
        Booking::factory()->create(['booking_number' => 'BS-2026-000099']);

        $response = $this->getJson('/api/admin/bookings?search=000042')->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('BS-2026-000042', $response->json('data.0.booking_number'));
    }

    public function test_admin_can_search_bookings_by_accommodation_name(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $accommodation = Accommodation::factory()->create(['name' => 'Hôtel Eden Palace Unique']);
        Booking::factory()->create(['accommodation_id' => $accommodation->id]);
        Booking::factory()->create(); // autre établissement, ne doit pas remonter

        $response = $this->getJson('/api/admin/bookings?search=Eden Palace')->assertOk();

        $this->assertCount(1, $response->json('data'));
    }

    public function test_booking_detail_exposes_promotion_origin(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $accommodation = Accommodation::factory()->create();
        $promotion = Promotion::create([
            'accommodation_id' => $accommodation->id,
            'discount_percent' => 15,
            'discount_type' => 'percent',
            'promo_code' => 'ETE2026',
            'is_active' => true,
            'start_date' => now()->subDay(),
            'end_date' => now()->addMonth(),
        ]);
        $booking = Booking::factory()->create([
            'accommodation_id' => $accommodation->id,
            'promotion_id' => $promotion->id,
        ]);

        $response = $this->getJson("/api/admin/bookings/{$booking->id}")->assertOk();

        $this->assertSame('ETE2026', $response->json('data.promotion.promo_code'));
    }

    public function test_booking_detail_exposes_loyalty_voucher_origin(): void
    {
        Sanctum::actingAs($this->makeAdmin());
        $traveler = User::factory()->create();
        $voucher = LoyaltyVoucher::create([
            'user_id' => $traveler->id,
            'code' => 'FID-ABC123',
            'discount_percent' => 10,
            'status' => 'used',
            'issued_at' => now(),
        ]);
        $booking = Booking::factory()->for($traveler)->create(['loyalty_voucher_id' => $voucher->id]);

        $response = $this->getJson("/api/admin/bookings/{$booking->id}")->assertOk();

        $this->assertSame('FID-ABC123', $response->json('data.loyalty_voucher.code'));
    }

    public function test_admin_can_cancel_a_booking_with_a_reason(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->makeAdmin());
        $booking = Booking::factory()->create(['status' => 'confirmed']);

        $this->putJson("/api/bookings/{$booking->id}", [
            'status' => 'cancelled',
            'reason' => 'Demande du client par téléphone',
        ])->assertOk();

        $this->assertSame('cancelled', $booking->fresh()->status->value);
    }

    public function test_admin_can_confirm_a_pending_booking_manually(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->makeAdmin());
        $booking = Booking::factory()->create(['status' => 'pending', 'amount_paid' => 0]);

        $response = $this->putJson("/api/bookings/{$booking->id}", ['status' => 'confirmed'])->assertOk();

        $this->assertSame('confirmed', $booking->fresh()->status->value);
        $this->assertArrayHasKey('warning', $response->json());
    }
}
