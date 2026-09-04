<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\AccommodationImage;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 : la page d'accueil affichait 4 villes codées en
 * dur (photos et prix inventés) sans lien avec les établissements réels.
 * Remplacées par /accommodations/top-cities, calculée à partir des
 * établissements publiés et réservables en base.
 */
class TopCitiesTest extends TestCase
{
    use RefreshDatabase;

    private function makeBookableAccommodation(array $attrs = []): Accommodation
    {
        $accommodation = Accommodation::factory()->create(array_merge(['status' => 'published'], $attrs));
        Room::create([
            'accommodation_id' => $accommodation->id,
            'name' => 'Chambre standard',
            'type' => 'double',
            'capacity' => 2,
            'price_per_night' => $accommodation->price_per_night,
            'is_active' => true,
            'quantity' => 1,
        ]);
        AccommodationImage::create([
            'accommodation_id' => $accommodation->id,
            'url' => 'https://example.test/photo.jpg',
            'is_primary' => true,
            'order' => 0,
        ]);
        return $accommodation;
    }

    public function test_returns_only_cities_with_published_and_bookable_accommodations(): void
    {
        $this->makeBookableAccommodation(['city' => 'Korhogo', 'price_per_night' => 12000]);
        $this->makeBookableAccommodation(['city' => 'Korhogo', 'price_per_night' => 20000]);
        $this->makeBookableAccommodation(['city' => 'Abidjan', 'price_per_night' => 50000]);

        // Établissement publié mais SANS chambre active : ne doit pas compter
        // comme réellement réservable.
        Accommodation::factory()->create(['status' => 'published', 'city' => 'San-Pédro']);

        // Établissement non publié : ne doit pas apparaître non plus.
        $this->makeBookableAccommodation(['city' => 'Bouaké', 'status' => 'pending']);

        $response = $this->getJson('/api/accommodations/top-cities')->assertOk();
        $cities = collect($response->json('cities'));

        $this->assertTrue($cities->contains('city', 'Korhogo'));
        $this->assertTrue($cities->contains('city', 'Abidjan'));
        $this->assertFalse($cities->contains('city', 'San-Pédro'), 'sans chambre active, ne doit pas apparaître');
        $this->assertFalse($cities->contains('city', 'Bouaké'), 'non publié, ne doit pas apparaître');

        $korhogo = $cities->firstWhere('city', 'Korhogo');
        $this->assertSame(2, $korhogo['accommodations_count']);
        $this->assertSame(12000.0, (float) $korhogo['from_price']);
    }

    public function test_returns_empty_list_when_no_accommodation_is_bookable(): void
    {
        $this->getJson('/api/accommodations/top-cities')
            ->assertOk()
            ->assertJson(['cities' => []]);
    }
}
