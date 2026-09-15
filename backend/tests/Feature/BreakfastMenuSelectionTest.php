<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-15 : "Je parle du formulaire du choix des plats
 * proposer au petit dej" — fonctionnalité distincte du système de quantité
 * (ExtraBreakfastTest) : chaque établissement saisit sa propre liste de
 * plats/options de petit-déjeuner (breakfast_menu_items), et le voyageur
 * choisit parmi cette liste dans le tunnel de réservation
 * (breakfast_menu_selection), une seule fois pour toute la réservation.
 *
 * La sélection soumise est filtrée par intersection avec la liste ACTUELLE
 * de l'établissement plutôt que de bloquer la réservation : si l'hôte a
 * modifié sa liste entre le chargement de la page et la soumission, les
 * plats devenus invalides sont silencieusement ignorés (voir
 * BookingController::store()).
 */
class BreakfastMenuSelectionTest extends TestCase
{
    use RefreshDatabase;

    private function makeRoom(array $menuItems = ['Croissant', 'Omelette', 'Jus de fruit']): Room
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'breakfast_menu_items' => $menuItems,
        ]);
        return Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 4,
            'price_per_night' => 20000,
            'is_active' => true,
            'quantity' => 1,
        ]);
    }

    private function bookingPayload(Room $room, array $overrides = []): array
    {
        return array_merge([
            'accommodation_id' => $room->accommodation_id,
            'room_id' => $room->id,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
            'guests' => 2,
            'residence_country' => "Côte d'Ivoire",
        ], $overrides);
    }

    public function test_booking_stores_the_selected_breakfast_menu_items(): void
    {
        $room = $this->makeRoom(['Croissant', 'Omelette', 'Jus de fruit']);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'breakfast_menu_selection' => ['Croissant', 'Jus de fruit'],
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(['Croissant', 'Jus de fruit'], $booking->breakfast_menu_selection);
    }

    public function test_booking_without_menu_selection_stores_null(): void
    {
        $room = $this->makeRoom();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertNull($booking->breakfast_menu_selection);
    }

    /**
     * L'hôte a retiré "Pain au chocolat" de sa liste entre le chargement de
     * la page de réservation par le voyageur et la soumission : ce plat
     * devenu invalide est silencieusement ignoré plutôt que de bloquer la
     * réservation avec une erreur 422.
     */
    public function test_menu_items_no_longer_offered_by_the_establishment_are_silently_dropped(): void
    {
        $room = $this->makeRoom(['Croissant', 'Omelette']);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'breakfast_menu_selection' => ['Croissant', 'Pain au chocolat'],
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertSame(['Croissant'], $booking->breakfast_menu_selection);
    }

    public function test_menu_selection_entirely_invalid_stores_null(): void
    {
        $room = $this->makeRoom(['Croissant', 'Omelette']);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/bookings', $this->bookingPayload($room, [
            'breakfast_menu_selection' => ['Pain au chocolat'],
        ]))->assertCreated();

        $booking = Booking::findOrFail($response->json('id'));
        $this->assertNull($booking->breakfast_menu_selection);
    }

    public function test_host_can_set_and_update_the_breakfast_menu_items(): void
    {
        $accommodation = Accommodation::factory()->create();
        Sanctum::actingAs($accommodation->host);

        $this->putJson("/api/accommodations/{$accommodation->id}", [
            'breakfast_menu_items' => ['Croissant', 'Thé', 'Café'],
        ])->assertOk();

        $this->assertSame(['Croissant', 'Thé', 'Café'], $accommodation->fresh()->breakfast_menu_items);
    }
}
