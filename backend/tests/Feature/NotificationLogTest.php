<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\NotificationLog;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 (Partie 4.3) : "événements de notification" —
 * traçabilité des e-mails/SMS/WhatsApp réellement envoyés pour une
 * réservation, consultable depuis le détail admin.
 */
class NotificationLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirming_a_booking_logs_a_notification_attempt_per_channel(): void
    {
        Mail::fake();
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $host->id]);
        $room = Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);
        $traveler = User::factory()->create(['phone' => '+2250700000000']);
        $booking = Booking::factory()->for($traveler)->create([
            'accommodation_id' => $accommodation->id,
            'room_id' => $room->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->makeAdmin());
        $this->putJson("/api/bookings/{$booking->id}", ['status' => 'confirmed'])->assertOk();

        $logs = NotificationLog::where('booking_id', $booking->id)->get();
        $this->assertGreaterThanOrEqual(2, $logs->count(), 'au moins e-mail voyageur + e-mail hôte doivent être tracés');
        $this->assertTrue($logs->contains(fn ($l) => $l->channel === 'email' && $l->recipient_type === 'traveler'));
        $this->assertTrue($logs->contains(fn ($l) => $l->channel === 'email' && $l->recipient_type === 'host'));
        $this->assertTrue($logs->every(fn ($l) => $l->event === 'booking_confirmed'));
    }

    public function test_a_failed_notification_is_logged_as_unsuccessful(): void
    {
        // Vérifie uniquement le comportement du modèle : un échec n'empêche
        // jamais l'enregistrement, et success=false est bien posé.
        $booking = Booking::factory()->create();

        NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'traveler', 'x@example.com', false, 'SMTP down');

        $log = NotificationLog::where('booking_id', $booking->id)->first();
        $this->assertFalse($log->success);
        $this->assertSame('SMTP down', $log->error);
    }

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }
}
