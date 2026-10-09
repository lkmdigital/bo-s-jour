<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Room;
use App\Models\RoomAvailability;
use App\Services\TravelerAiAssistantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Recherche de l'assistant IA voyageur : avec des dates, il ne propose que des établissements
 * réellement disponibles, au prix total du séjour, avec un lien de réservation prérempli.
 * Les outils sont appelés directement : aucun appel à l'API Claude.
 */
class TravelerAiAssistantSearchTest extends TestCase
{
    use RefreshDatabase;

    private string $in;
    private string $out;

    protected function setUp(): void
    {
        parent::setUp();
        $this->in = now()->addDays(10)->toDateString();
        $this->out = now()->addDays(13)->toDateString(); // 3 nuits
    }

    private function accommodation(array $attributes = []): Accommodation
    {
        return Accommodation::factory()->create($attributes + [
            'status' => 'published',
            'city' => 'Abidjan',
            'type' => 'hotel',
            'price_per_night' => 50000,
            'max_guests' => 4,
            'cancellation_policy_hours' => 48,
            'deposit_required' => true,
            'deposit_amount' => 'first_night',
        ]);
    }

    private function room(Accommodation $accommodation, array $attributes = []): Room
    {
        return Room::create($attributes + [
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => 40000,
            'is_active' => true,
            'quantity' => 1,
        ]);
    }

    private function tool(string $name, array $input): array
    {
        $method = new \ReflectionMethod(TravelerAiAssistantService::class, 'executeTool');

        return json_decode($method->invoke(new TravelerAiAssistantService(null), $name, $input), true);
    }

    public function test_without_dates_it_lists_establishments_and_says_availability_is_unchecked(): void
    {
        $this->room($this->accommodation(['name' => 'Hôtel Ivoire']));

        $result = $this->tool('search_accommodations', ['city' => 'Abidjan']);

        $this->assertSame(1, $result['count']);
        $this->assertFalse($result['dates_checked']);
        $this->assertSame('Hôtel Ivoire', $result['results'][0]['name']);
        $this->assertArrayNotHasKey('booking_link', $result['results'][0]);
        $this->assertStringContainsString('/accommodations/', $result['results'][0]['listing_link']);
    }

    public function test_it_filters_by_type(): void
    {
        $this->room($this->accommodation(['name' => 'Hôtel Ivoire', 'type' => 'hotel']));
        $this->room($this->accommodation(['name' => 'Résidence Cocody', 'type' => 'apartment']));

        $result = $this->tool('search_accommodations', ['city' => 'Abidjan', 'type' => 'apartment']);

        $this->assertSame(['Résidence Cocody'], array_column($result['results'], 'name'));
        $this->assertSame('Résidence', $result['results'][0]['type']);
    }

    public function test_with_dates_it_returns_the_total_the_payment_options_and_a_prefilled_booking_link(): void
    {
        $accommodation = $this->accommodation(['name' => 'Hôtel Ivoire']);
        $room = $this->room($accommodation);

        $result = $this->tool('search_accommodations', [
            'city' => 'Abidjan', 'check_in' => $this->in, 'check_out' => $this->out, 'max_guests' => 2,
        ]);

        $this->assertTrue($result['dates_checked']);
        $this->assertSame(3, $result['nights']);
        $offer = $result['results'][0];
        $this->assertSame('Chambre standard', $offer['room']);
        $this->assertEquals(120000, $offer['total_fcfa']); // 3 nuits × 40 000 (tarif de la chambre)
        $this->assertEquals(114000, $offer['pay_in_full_fcfa']); // −5 %
        $this->assertEquals(40000, $offer['guarantee']['amount_fcfa']); // 1re nuit
        $this->assertEquals(80000, $offer['guarantee']['balance_at_arrival_fcfa']);

        parse_str(parse_url($offer['booking_link'], PHP_URL_QUERY), $query);
        $this->assertStringStartsWith('/bookings/new?', $offer['booking_link']);
        $this->assertEquals(
            ['accommodation' => $accommodation->id, 'room' => $room->id, 'check_in' => $this->in, 'check_out' => $this->out, 'guests' => 2],
            $query
        );
    }

    public function test_the_announced_total_is_the_one_of_the_price_preview_shown_in_the_booking_form(): void
    {
        $accommodation = $this->accommodation(['deposit_amount' => 'percentage', 'deposit_percentage' => 30]);
        $room = $this->room($accommodation);

        $offer = $this->tool('search_accommodations', ['check_in' => $this->in, 'check_out' => $this->out])['results'][0];
        $preview = $this->getJson("/api/accommodations/{$accommodation->id}/price-preview?check_in={$this->in}&check_out={$this->out}&room_id={$room->id}")
            ->assertOk()->json();

        $this->assertEquals($preview['total'], $offer['total_fcfa']);
        $this->assertEquals($preview['payment_options']['options']['guarantee']['amount'], $offer['guarantee']['amount_fcfa']);
        $this->assertSame('30 % du séjour', $offer['guarantee']['basis']);
    }

    public function test_a_fully_booked_establishment_is_not_proposed(): void
    {
        $full = $this->accommodation(['name' => 'Complet']);
        $fullRoom = $this->room($full);
        Booking::factory()->create([
            'accommodation_id' => $full->id, 'room_id' => $fullRoom->id, 'rooms_quantity' => 1,
            'check_in' => $this->in, 'check_out' => $this->out, 'status' => 'confirmed', 'payment_status' => 'paid',
        ]);
        $this->room($this->accommodation(['name' => 'Libre']));

        $result = $this->tool('search_accommodations', ['city' => 'Abidjan', 'check_in' => $this->in, 'check_out' => $this->out]);

        $this->assertSame(['Libre'], array_column($result['results'], 'name'));
        $this->assertSame(1, $result['unavailable_on_these_dates']);
    }

    public function test_a_pending_request_does_not_block_the_room(): void
    {
        // Seules les réservations confirmées occupent une chambre (retour client 2026-09-18).
        $pending = $this->accommodation(['name' => 'Demande en attente']);
        Booking::factory()->create([
            'accommodation_id' => $pending->id, 'room_id' => $this->room($pending)->id,
            'check_in' => $this->in, 'check_out' => $this->out, 'status' => 'pending',
        ]);

        $result = $this->tool('search_accommodations', ['city' => 'Abidjan', 'check_in' => $this->in, 'check_out' => $this->out]);

        $this->assertSame(['Demande en attente'], array_column($result['results'], 'name'));
    }

    public function test_a_night_blocked_by_the_host_makes_the_room_unavailable(): void
    {
        $blocked = $this->accommodation(['name' => 'Bloqué par le partenaire']);
        try {
            RoomAvailability::create(['room_id' => $this->room($blocked)->id, 'date' => $this->in, 'status' => 'blocked']);
        } catch (\Illuminate\Database\QueryException) {
            // Le statut « blocked » n'est ajouté à l'énumération qu'en MySQL (migration
            // 2026_04_26_000001) : la base SQLite des tests le refuse.
            $this->markTestSkipped('Statut « blocked » indisponible sur SQLite ; vérifié sur MySQL.');
        }

        $result = $this->tool('search_accommodations', ['city' => 'Abidjan', 'check_in' => $this->in, 'check_out' => $this->out]);

        $this->assertSame(0, $result['count']);
    }

    public function test_rooms_too_small_for_the_group_are_skipped(): void
    {
        $accommodation = $this->accommodation(['name' => 'Hôtel Ivoire']);
        $this->room($accommodation, ['name' => 'Double', 'capacity' => 2]);
        $this->room($accommodation, ['name' => 'Suite familiale', 'capacity' => 4, 'price_per_night' => 90000]);

        $offer = $this->tool('search_accommodations', [
            'check_in' => $this->in, 'check_out' => $this->out, 'max_guests' => 4,
        ])['results'][0];

        $this->assertSame('Suite familiale', $offer['room']);
    }

    public function test_the_last_search_is_exposed_as_cards_for_the_chat_interface(): void
    {
        $accommodation = $this->accommodation(['name' => 'Hôtel Ivoire']);
        $room = $this->room($accommodation);
        \App\Models\AccommodationImage::create([
            'accommodation_id' => $accommodation->id, 'url' => '/storage/accommodations/1/photo.jpg', 'is_primary' => true,
        ]);

        $assistant = new TravelerAiAssistantService(null);
        $method = new \ReflectionMethod($assistant, 'executeTool');
        $this->assertSame([], $assistant->lastOffers());

        // Sans dates : carte avec le tarif par nuit et un lien vers la fiche, pas de réservation.
        $method->invoke($assistant, 'search_accommodations', ['city' => 'Abidjan']);
        $card = $assistant->lastOffers()[0];
        $this->assertSame('Hôtel Ivoire', $card['name']);
        $this->assertSame('/storage/accommodations/1/photo.jpg', $card['photo']);
        $this->assertNull($card['booking_link']);
        $this->assertNull($card['total_fcfa']);

        // Avec dates : total du séjour et lien de réservation prérempli.
        $method->invoke($assistant, 'search_accommodations', ['city' => 'Abidjan', 'check_in' => $this->in, 'check_out' => $this->out]);
        $card = $assistant->lastOffers()[0];
        $this->assertEquals(120000, $card['total_fcfa']);
        $this->assertSame(3, $card['nights']);
        $this->assertStringContainsString("room={$room->id}", $card['booking_link']);

        // Une recherche sans résultat efface les cartes précédentes.
        $method->invoke($assistant, 'search_accommodations', ['city' => 'Korhogo', 'check_in' => $this->in, 'check_out' => $this->out]);
        $this->assertSame([], $assistant->lastOffers());
    }

    public function test_unusable_dates_are_reported_instead_of_guessed(): void
    {
        $this->room($this->accommodation());

        $this->assertArrayHasKey('error', $this->tool('search_accommodations', ['check_in' => $this->in]));
        $this->assertArrayHasKey('error', $this->tool('search_accommodations', ['check_in' => $this->out, 'check_out' => $this->in]));
        $this->assertArrayHasKey('error', $this->tool('search_accommodations', [
            'check_in' => now()->subDays(3)->toDateString(), 'check_out' => now()->addDay()->toDateString(),
        ]));
    }

    public function test_details_list_the_rooms_available_on_the_dates(): void
    {
        $accommodation = $this->accommodation(['name' => 'Hôtel Ivoire']);
        $this->room($accommodation, ['name' => 'Double']);
        $this->room($accommodation, ['name' => 'Suite', 'price_per_night' => 90000]);

        $details = $this->tool('get_accommodation_details', [
            'accommodation_id' => $accommodation->id, 'check_in' => $this->in, 'check_out' => $this->out,
        ]);

        $this->assertTrue($details['available']);
        $this->assertSame(['Double', 'Suite'], array_column($details['available_rooms'], 'room'));
        $this->assertSame('Hôtel', $details['type']);
        $this->assertArrayNotHasKey('available', $this->tool('get_accommodation_details', ['accommodation_id' => $accommodation->id]));
    }
}
