<?php

namespace App\Console\Commands;

use App\Models\Accommodation;
use App\Models\AccommodationImage;
use App\Models\Room;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Outil de dev : peuple un compte hôte de test avec des établissements
 * répartis sur plusieurs villes/communes, pour tester l'espace partenaire
 * en conditions réalistes (Documents, Chambres, Calendrier, Promotions…).
 * Ne fait rien hors environnement local, par sécurité.
 */
class SeedTestHostAccommodations extends Command
{
    protected $signature = 'dev:seed-host-accommodations {email}';

    protected $description = "Crée ~20 établissements de démo pour un compte hôte (3 par commune/ville).";

    private const IMAGES = [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
    ];

    public function handle(): int
    {
        if (!app()->environment('local')) {
            $this->error('Cette commande ne peut être exécutée qu\'en environnement local.');
            return self::FAILURE;
        }

        $host = User::where('email', $this->argument('email'))->first();
        if (!$host) {
            $this->error('Hôte introuvable pour cet e-mail.');
            return self::FAILURE;
        }
        if ($host->role !== 'host') {
            $this->error('Ce compte n\'a pas le rôle hôte.');
            return self::FAILURE;
        }

        // Débloque la création/publication d'établissements pour ce compte de test
        // (AccommodationController::store() exige profile_completed + profile_verified).
        $host->forceFill(['profile_completed' => true, 'profile_verified' => true])->save();

        // 7 zones (villes/communes), 3 établissements chacune sauf la dernière (2) = 20.
        $zones = [
            ['city' => 'Cocody', 'lat' => 5.3452, 'lng' => -3.9866, 'addr' => 'Boulevard Latrille, Cocody'],
            ['city' => 'Marcory', 'lat' => 5.2945, 'lng' => -3.9822, 'addr' => 'Zone 4, Marcory'],
            ['city' => 'Yopougon', 'lat' => 5.3453, 'lng' => -4.0752, 'addr' => 'Quartier Sicogi, Yopougon'],
            ['city' => 'Plateau', 'lat' => 5.3200, 'lng' => -4.0196, 'addr' => 'Avenue Chardy, Plateau'],
            ['city' => 'Yamoussoukro', 'lat' => 6.8276, 'lng' => -5.2893, 'addr' => 'Route de Yamoussoukro, Km 12'],
            ['city' => 'Bouaké', 'lat' => 7.6906, 'lng' => -5.0301, 'addr' => 'Avenue de la République, Bouaké'],
            ['city' => 'San-Pédro', 'lat' => 4.7485, 'lng' => -6.6363, 'addr' => 'Avenue de la Plage, San-Pédro'],
        ];

        $namePrefixes = ['Résidence', 'Hôtel', 'Villa', 'Lodge', 'Maison d\'Hôtes', 'Appart\'Hôtel'];
        $nameSuffixes = ['Étoile', 'Émeraude', 'Palmeraie', 'Horizon', 'Baobab', 'Perle', 'Oasis', 'Prestige', 'Zenith', 'Confort'];
        $types = ['hotel', 'lodge', 'guesthouse', 'apartment'];
        // Vocabulaire aligné sur commonAmenities (AccommodationCreationWizard.tsx) — le
        // même que celui réellement proposé à l'hôte, pour que les filtres de recherche
        // fonctionnent aussi sur ces établissements de démo.
        $amenityPool = ['Wi-Fi', 'Piscine', 'Parking', 'Restaurant', 'Salle de sport', 'Spa', 'Télévision', 'Cuisine équipée', 'Climatisation', 'Petit-déjeuner'];

        $created = 0;
        $counter = 1;

        foreach ($zones as $zi => $zone) {
            $perZone = $zi === count($zones) - 1 ? 2 : 3;

            for ($i = 1; $i <= $perZone; $i++) {
                $name = $namePrefixes[array_rand($namePrefixes)] . ' ' . $nameSuffixes[array_rand($nameSuffixes)] . ' ' . $zone['city'];
                $slug = Str::slug($name) . '-' . $counter;
                $type = $types[array_rand($types)];
                $starPool = [null, 2, 3, 3, 4, 5];
                $starRating = $starPool[array_rand($starPool)];
                $price = rand(15, 90) * 1000;
                $amenities = collect($amenityPool)->shuffle()->take(rand(3, 6))->values()->all();
                $cancellationHours = [48, 24, 0][array_rand([48, 24, 0])];

                $accommodation = Accommodation::create([
                    'host_id' => $host->id,
                    'name' => $name,
                    'slug' => $slug,
                    'whatsapp' => '+225 07' . rand(10000000, 99999999),
                    'type' => $type,
                    'description' => "Établissement confortable situé à {$zone['city']}, à proximité des principaux axes et commerces. Idéal pour un séjour d'affaires ou de détente.",
                    'description_en' => "Comfortable establishment located in {$zone['city']}, close to main roads and shops. Ideal for business or leisure stays.",
                    'address' => $zone['addr'] . ' ' . $counter,
                    'city' => $zone['city'],
                    'latitude' => $zone['lat'] + (rand(-50, 50) / 10000),
                    'longitude' => $zone['lng'] + (rand(-50, 50) / 10000),
                    'price_per_night' => $price,
                    'max_guests' => rand(2, 6),
                    'bedrooms' => rand(1, 3),
                    'bathrooms' => rand(1, 2),
                    'amenities' => $amenities,
                    'star_rating' => $starRating,
                    'cancellation_policy_hours' => $cancellationHours,
                    'check_in_time' => '14:00',
                    'check_out_time' => '11:00',
                    'status' => 'published',
                    'is_featured' => $counter % 5 === 0,
                ]);

                foreach (array_slice(self::IMAGES, 0, 5) as $idx => $url) {
                    AccommodationImage::create([
                        'accommodation_id' => $accommodation->id,
                        'url' => $url,
                        'is_primary' => $idx === 0,
                        'order' => $idx + 1,
                    ]);
                }

                $roomTypes = ['single', 'double', 'suite'];
                foreach (array_slice($roomTypes, 0, rand(2, 3)) as $ri => $roomType) {
                    Room::create([
                        'accommodation_id' => $accommodation->id,
                        'name' => 'Chambre ' . ($ri + 1) . ' - ' . ucfirst($roomType),
                        'type' => $roomType,
                        'description' => "Chambre {$roomType} confortable et bien équipée.",
                        'description_en' => "Comfortable, well-equipped {$roomType} room.",
                        'capacity' => $roomType === 'single' ? 1 : ($roomType === 'suite' ? 4 : 2),
                        'price_per_night' => $price + rand(-3000, 8000),
                        'amenities' => ['wifi', 'tv', 'ac'],
                        'bedrooms' => 1,
                        'bathrooms' => 1,
                        'is_active' => true,
                    ]);
                }

                $created++;
                $counter++;
            }
        }

        $this->info("{$created} établissement(s) créé(s) pour {$host->email}.");
        return self::SUCCESS;
    }
}
