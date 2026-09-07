<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Message;
use App\Models\Payment;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.3) : l'hôte doit être notifié DANS
 * l'Extranet (frontend/app/dashboard/host/inbox, qui lit le modèle Message
 * par recipient_id — voir Host/HostInboxController::index()) pour chaque
 * nouvelle réservation, modification et annulation — pas seulement par
 * email/SMS externes.
 *
 * Couvre les DEUX chemins réels de confirmation, qui sont deux implémentations
 * parallèles indépendantes découvertes en creusant le code :
 *   - BookingService::confirm() : confirmation manuelle admin (PUT status=confirmed)
 *   - PaymentController::confirmPaymentSuccess()/sendBookingEmails() : le vrai
 *     webhook Malia Pay (POST /api/payments/webhook)
 */
class HostInAppNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeAccommodationWithHost(): Accommodation
    {
        $host = User::factory()->create(['role' => 'host']);
        return Accommodation::factory()->create(['host_id' => $host->id]);
    }

    public function test_admin_confirming_a_booking_notifies_the_host_in_app(): void
    {
        Mail::fake();
        $accommodation = $this->makeAccommodationWithHost();
        $booking = Booking::factory()->create([
            'accommodation_id' => $accommodation->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->putJson("/api/bookings/{$booking->id}", ['status' => 'confirmed'])->assertOk();

        $message = Message::where('booking_id', $booking->id)
            ->where('recipient_id', $accommodation->host_id)
            ->first();

        $this->assertNotNull($message, "l'hôte doit recevoir un message dans son Extranet");
        $this->assertTrue($message->is_from_platform);
        $this->assertSame('Nouvelle réservation confirmée', $message->subject);
    }

    public function test_a_real_payment_webhook_notifies_the_host_in_app(): void
    {
        // Mirroring CommissionBasePriceTest : chemin webhook réel Malia Pay,
        // distinct de BookingService::confirm() — doit aussi notifier l'hôte.
        config([
            'services.malia_pay.api_url' => 'https://sandbox.malia.test/api',
            'services.malia_pay.api_key' => 'test-key',
            'services.malia_pay.merchant_id' => 'test-merchant',
            'services.malia_pay.sandbox' => true,
        ]);
        Mail::fake();
        $accommodation = $this->makeAccommodationWithHost();
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'payment_status' => 'pending',
            'base_price' => 30000,
            'total_price' => 30000,
        ]);
        Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $traveler->id,
            'amount' => 30000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-HOSTNOTIF-1',
        ]);

        $this->postJson('/api/payments/webhook', [
            'reference' => 'REF-HOSTNOTIF-1',
            'status' => 'success',
            'transaction_id' => 'FAKE_TX_HOSTNOTIF',
            'montant' => 30000,
        ])->assertOk();

        $message = Message::where('booking_id', $booking->id)
            ->where('recipient_id', $accommodation->host_id)
            ->first();

        $this->assertNotNull($message, "l'hôte doit recevoir un message dans son Extranet même via le webhook réel");
        $this->assertSame('Nouvelle réservation confirmée', $message->subject);
    }

    public function test_modifying_booking_dates_notifies_the_host_in_app(): void
    {
        $accommodation = $this->makeAccommodationWithHost();
        $room = Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'confirmed',
            'check_in' => now()->addDays(10),
            'check_out' => now()->addDays(12),
        ]);

        Sanctum::actingAs($traveler);
        $this->putJson("/api/bookings/{$booking->id}", [
            'check_in' => now()->addDays(15)->toDateString(),
            'check_out' => now()->addDays(17)->toDateString(),
        ])->assertOk();

        $message = Message::where('booking_id', $booking->id)
            ->where('recipient_id', $accommodation->host_id)
            ->where('subject', 'Réservation modifiée')
            ->first();

        $this->assertNotNull($message, "l'hôte doit être notifié d'une modification de dates");
    }

    public function test_cancelling_a_booking_notifies_the_host_in_app(): void
    {
        Mail::fake();
        $accommodation = $this->makeAccommodationWithHost();
        $traveler = User::factory()->create();
        $booking = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($traveler);
        $this->putJson("/api/bookings/{$booking->id}", [
            'status' => 'cancelled',
            'reason' => 'Changement de plans',
        ])->assertOk();

        $message = Message::where('booking_id', $booking->id)
            ->where('recipient_id', $accommodation->host_id)
            ->where('subject', 'Réservation annulée')
            ->first();

        $this->assertNotNull($message, "l'hôte doit être notifié d'une annulation");
        $this->assertStringContainsString('Changement de plans', $message->body);
    }
}
