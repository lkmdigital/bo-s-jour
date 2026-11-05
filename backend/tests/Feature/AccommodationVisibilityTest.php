<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\AccommodationImage;
use App\Models\Booking;
use App\Models\Room;
use App\Models\User;
use App\Support\CityName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Constat du 2026-11-05 : des établissements PUBLIÉS mais sans chambre active (Villa Massouk, La Belle Rive) étaient
 * introuvables sur le site — qui envoie toujours un nombre de voyageurs — alors que l'écran admin affichait « 3 chambres,
 * 3 libres » (nombre déclaré à la création). Ces tests figent les corrections : recherche, villes populaires, nom de ville,
 * liste de vérification de publication et écran admin.
 */
class AccommodationVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function published(array $attrs = [], ?int $roomCapacity = null): Accommodation
    {
        $a = Accommodation::factory()->create($attrs + ['status' => 'published', 'max_guests' => 6]);
        if ($roomCapacity !== null) {
            Room::create(['accommodation_id' => $a->id, 'name' => 'Chambre', 'type' => 'double', 'capacity' => $roomCapacity, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 1]);
        }

        return $a;
    }

    private function idsFor(array $query): array
    {
        return collect($this->getJson('/api/accommodations?' . http_build_query($query + ['per_page' => 50]))->assertOk()->json('data'))->pluck('id')->all();
    }

    // --- Recherche -----------------------------------------------------------------------------------------------

    public function test_an_accommodation_without_rooms_stays_in_searches_by_number_of_travelers(): void
    {
        $noRooms = $this->published(['name' => 'Villa sans chambre', 'max_guests' => 6]);

        $this->assertContains($noRooms->id, $this->idsFor(['guests' => 1]), 'le site envoie toujours guests=1');
        $this->assertContains($noRooms->id, $this->idsFor(['guests' => 6]));
        $this->assertNotContains($noRooms->id, $this->idsFor(['guests' => 7]), 'au-delà de sa capacité déclarée, elle ne convient pas');
        $this->assertContains($noRooms->id, $this->idsFor(['search' => 'sans chambre', 'guests' => 2]));
    }

    public function test_an_accommodation_without_rooms_stays_in_searches_by_dates_unless_already_booked(): void
    {
        $noRooms = $this->published(['max_guests' => 4]);
        $in = now()->addDays(20)->toDateString();
        $out = now()->addDays(23)->toDateString();

        $this->assertContains($noRooms->id, $this->idsFor(['check_in' => $in, 'check_out' => $out, 'guests' => 2]));

        Booking::factory()->create(['accommodation_id' => $noRooms->id, 'room_id' => null, 'status' => 'confirmed', 'check_in' => now()->addDays(21)->toDateString(), 'check_out' => now()->addDays(22)->toDateString()]);
        $this->assertNotContains($noRooms->id, $this->idsFor(['check_in' => $in, 'check_out' => $out, 'guests' => 2]), 'une réservation confirmée sans chambre occupe l\'établissement');

        $this->assertContains($noRooms->id, $this->idsFor(['check_in' => now()->addDays(40)->toDateString(), 'check_out' => now()->addDays(42)->toDateString()]), 'libre à d\'autres dates');
    }

    public function test_an_accommodation_with_rooms_still_follows_its_rooms(): void
    {
        $small = $this->published(['max_guests' => 10], roomCapacity: 2);   // beaucoup de places déclarées, mais une seule chambre de 2

        $this->assertContains($small->id, $this->idsFor(['guests' => 2]));
        $this->assertNotContains($small->id, $this->idsFor(['guests' => 4]), 'la capacité de ses chambres prime sur la capacité déclarée');
    }

    public function test_an_accommodation_whose_rooms_are_all_inactive_is_judged_like_one_without_rooms(): void
    {
        $a = $this->published(['max_guests' => 3]);
        Room::create(['accommodation_id' => $a->id, 'name' => 'Chambre fermée', 'type' => 'double', 'capacity' => 2, 'price_per_night' => 20000, 'is_active' => false, 'quantity' => 1]);

        $this->assertContains($a->id, $this->idsFor(['guests' => 3]));
        $this->assertNotContains($a->id, $this->idsFor(['guests' => 4]));
    }

    public function test_unpublished_accommodations_never_appear_whatever_the_search(): void
    {
        $pending = $this->published(['status' => 'pending']);

        $this->assertNotContains($pending->id, $this->idsFor([]));
        $this->assertNotContains($pending->id, $this->idsFor(['guests' => 1]));
    }

    // --- Villes ---------------------------------------------------------------------------------------------------

    public function test_a_city_is_always_written_the_same_way(): void
    {
        $this->assertSame('Korhogo', CityName::normalize('KORHOGO'));
        $this->assertSame('San Pedro', CityName::normalize('san pedro'));
        $this->assertSame('Grand-Bassam', CityName::normalize('GRAND-BASSAM'));
        $this->assertSame('Fouénan, Touba', CityName::normalize('  fouénan,   touba '));
        $this->assertNull(CityName::normalize(null));

        $a = Accommodation::factory()->create(['city' => 'SAN pedro']);
        $this->assertSame('San Pedro', $a->fresh()->city);
        $a->update(['city' => 'KORHOGO']);
        $this->assertSame('Korhogo', $a->fresh()->city);
    }

    public function test_the_migration_fixes_existing_cities_and_can_be_undone(): void
    {
        Storage::fake('local');
        $a = Accommodation::factory()->create(['city' => 'Abidjan']);
        $b = Accommodation::factory()->create(['city' => 'Abidjan']);
        // Données historiques écrites sans passer par le modèle.
        DB::table('accommodations')->where('id', $a->id)->update(['city' => 'SAN PEDRO']);
        DB::table('accommodations')->where('id', $b->id)->update(['city' => 'San pedro']);

        $migration = require database_path('migrations/2026_11_05_100000_normalize_accommodation_city_names.php');
        $migration->up();

        $this->assertSame('San Pedro', DB::table('accommodations')->where('id', $a->id)->value('city'));
        $this->assertSame('San Pedro', DB::table('accommodations')->where('id', $b->id)->value('city'));
        $this->assertCount(1, Storage::disk('local')->files('backups'), 'une sauvegarde des anciennes valeurs est écrite');

        $migration->up();   // idempotente : rien à refaire, pas de seconde sauvegarde
        $this->assertCount(1, Storage::disk('local')->files('backups'));

        $migration->down();
        $this->assertSame('SAN PEDRO', DB::table('accommodations')->where('id', $a->id)->value('city'));
        $this->assertSame('San pedro', DB::table('accommodations')->where('id', $b->id)->value('city'));
    }

    public function test_popular_cities_count_every_published_accommodation_and_merge_spellings(): void
    {
        $withRoom = $this->published(['city' => 'Korhogo'], roomCapacity: 2);
        $noRoom = $this->published(['city' => 'Korhogo']);
        foreach ([$withRoom, $noRoom] as $a) {
            AccommodationImage::create(['accommodation_id' => $a->id, 'url' => 'https://example.test/' . $a->id . '.jpg', 'is_primary' => true, 'order' => 0]);
        }
        DB::table('accommodations')->where('id', $noRoom->id)->update(['city' => 'KORHOGO']);   // ancienne graphie

        $cities = collect($this->getJson('/api/accommodations/top-cities')->assertOk()->json('cities'));

        $this->assertCount(1, $cities, 'Korhogo et KORHOGO forment une seule ville');
        $this->assertSame(2, $cities->first()['accommodations_count'], 'avec ou sans chambre, les deux comptent');
    }

    public function test_a_city_card_uses_a_photo_even_when_the_primary_one_is_not_flagged(): void
    {
        $a = $this->published(['city' => 'Boundiali']);
        AccommodationImage::create(['accommodation_id' => $a->id, 'url' => 'https://example.test/seule-photo.jpg', 'is_primary' => false, 'order' => 1]);

        $cities = collect($this->getJson('/api/accommodations/top-cities')->assertOk()->json('cities'));

        $this->assertSame('https://example.test/seule-photo.jpg', $cities->firstWhere('city', 'Boundiali')['image']);
    }

    // --- Publication et écran admin -----------------------------------------------------------------------------

    private function readyHost(): User
    {
        return User::factory()->create(['role' => 'host', 'bank_name' => 'Banque', 'bank_account_holder' => 'Hôte', 'bank_account_number' => 'CI0000000000']);
    }

    private function readyAccommodation(User $host): Accommodation
    {
        $a = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending', 'price_per_night' => 30000, 'cancellation_policy_hours' => 48, 'whatsapp' => '0701020304']);
        foreach (range(1, 5) as $i) {
            AccommodationImage::create(['accommodation_id' => $a->id, 'url' => "https://example.test/$i.jpg", 'is_primary' => $i === 1, 'order' => $i]);
        }

        return $a;
    }

    public function test_publishing_without_rooms_is_possible_but_the_host_is_advised_to_add_them(): void
    {
        $host = $this->readyHost();
        $a = $this->readyAccommodation($host);
        Sanctum::actingAs($host);

        $checklist = $this->getJson("/api/accommodations/{$a->id}/readiness")->assertOk();
        $this->assertTrue($checklist->json('ready'), 'l\'absence de chambre ne bloque pas la publication');
        $this->assertFalse($checklist->json('checks.rooms.ok'));
        $this->assertFalse($checklist->json('checks.rooms.blocking'));

        $this->postJson("/api/accommodations/{$a->id}/submit-for-review")
            ->assertOk()
            ->assertJsonPath('warnings.0', "Aucune chambre n'est enregistrée : pensez à les ajouter depuis l'onglet « Chambres » pour que les voyageurs puissent choisir.");

        Room::create(['accommodation_id' => $a->id, 'name' => 'Chambre', 'type' => 'double', 'capacity' => 2, 'price_per_night' => 30000, 'is_active' => true, 'quantity' => 1]);
        $this->assertTrue($this->getJson("/api/accommodations/{$a->id}/readiness")->json('checks.rooms.ok'));
        $this->assertSame([], $this->postJson("/api/accommodations/{$a->id}/submit-for-review")->assertOk()->json('warnings'));
    }

    public function test_the_blocking_checks_still_block_publication(): void
    {
        $host = User::factory()->create(['role' => 'host']);   // sans coordonnées bancaires
        $a = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'pending']);
        Sanctum::actingAs($host);

        $this->assertFalse($this->getJson("/api/accommodations/{$a->id}/readiness")->json('ready'));
        $this->postJson("/api/accommodations/{$a->id}/submit-for-review")->assertStatus(422);
    }

    public function test_the_admin_sees_the_real_number_of_rooms_and_a_warning_when_there_is_none(): void
    {
        $a = $this->published(['bedrooms' => 3]);   // 3 chambres DÉCLARÉES, aucune enregistrée
        $withRooms = $this->published(['bedrooms' => 9], roomCapacity: 2);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $list = collect($this->getJson('/api/admin/accommodations?per_page=50')->assertOk()->json('data'));

        $none = $list->firstWhere('id', $a->id)['stats'];
        $this->assertSame(0, $none['total_rooms'], 'plus de « 3 chambres » inventées à partir du nombre déclaré');
        $this->assertSame(3, $none['declared_rooms']);
        $this->assertTrue($none['rooms_missing']);

        $ok = $list->firstWhere('id', $withRooms->id)['stats'];
        $this->assertSame(1, $ok['total_rooms']);
        $this->assertFalse($ok['rooms_missing']);
    }
}
