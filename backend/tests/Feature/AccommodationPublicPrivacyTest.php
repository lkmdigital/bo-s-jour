<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Constat du 2026-11-05 (en construisant la fiche de l'appli mobile) : GET /api/accommodations/{id} et la liste
 * GET /api/accommodations, publics et sans authentification, renvoyaient l'enregistrement COMPLET de l'hôte
 * (e-mail, téléphone, WhatsApp, identifiants Google, dernière adresse IP de connexion, numéros d'entreprise)
 * ainsi que des réglages internes de l'établissement (adresse privée de synchronisation iCal…).
 * Seuls les documents et les coordonnées bancaires étaient masqués.
 */
class AccommodationPublicPrivacyTest extends TestCase
{
    use RefreshDatabase;

    /** Ce qui ne doit jamais quitter le serveur pour un visiteur. */
    private const PRIVATE_HOST_FIELDS = [
        'email', 'pending_email', 'phone', 'phone_fixed', 'whatsapp', 'google_id', 'microsoft_id', 'last_login_ip', 'last_login_at',
        'login_count', 'company_vat', 'company_rccm', 'company_tax_number', 'residence_city', 'nationality', 'block_reason',
        'referral_code', 'loyalty_points_balance', 'staff_permissions', 'two_factor_enabled', 'role', 'status',
    ];

    private const INTERNAL_ACCOMMODATION_FIELDS = [
        'ical_import_url', 'ical_last_synced_at', 'ical_last_sync_status', 'ical_last_sync_error', 'ical_last_sync_events_count',
        'channel_manager_interest_requested_at', 'info_confirmed_at', 'info_update_reminder_sent_at', 'submitted_for_review_at',
    ];

    private function publishedAccommodation(): array
    {
        $host = User::factory()->create([
            'role' => 'host',
            'first_name' => 'Tieba',
            'name' => 'Tieba Coulibaly',
            'email' => 'hote.prive@example.com',
            'phone' => '0701020304',
            'whatsapp' => '0701020304',
            'google_id' => 'google-12345',
            'last_login_ip' => '41.66.12.34',
            'company_vat' => 'CI-TVA-9988',
        ]);
        $accommodation = Accommodation::factory()->create([
            'host_id' => $host->id,
            'status' => 'published',
            'ical_import_url' => 'https://calendrier.example.com/secret-token-abc',
        ]);

        return [$host, $accommodation];
    }

    private function assertNothingPrivateIn(array $host): void
    {
        foreach (self::PRIVATE_HOST_FIELDS as $field) {
            $this->assertArrayNotHasKey($field, $host, "« $field » de l'hôte ne doit pas être public");
        }
        $this->assertStringNotContainsString('hote.prive@example.com', json_encode($host));
        $this->assertStringNotContainsString('0701020304', json_encode($host));
        $this->assertStringNotContainsString('41.66.12.34', json_encode($host));
    }

    public function test_a_visitor_sees_only_the_public_identity_of_the_host_on_the_accommodation_page(): void
    {
        [$host, $accommodation] = $this->publishedAccommodation();

        $response = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();

        $this->assertNothingPrivateIn($response->json('host'));
        $this->assertSame($host->id, $response->json('host.id'));
        $this->assertSame('Tieba', $response->json('host.first_name'));
        $this->assertSame('Tieba Coulibaly', $response->json('host.name'));
        // Ce que le site et l'appli utilisent continue d'être renvoyé.
        $this->assertSame($host->id, $response->json('host_id'));
        $this->assertSame($accommodation->name, $response->json('name'));
        $this->assertArrayHasKey('effective_price_per_night', $response->json());
        $this->assertArrayHasKey('guarantee', $response->json());
    }

    public function test_internal_settings_of_the_accommodation_are_not_public(): void
    {
        [, $accommodation] = $this->publishedAccommodation();

        $body = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk()->json();

        foreach (self::INTERNAL_ACCOMMODATION_FIELDS as $field) {
            $this->assertArrayNotHasKey($field, $body, "« $field » est un réglage interne");
        }
        $this->assertStringNotContainsString('secret-token-abc', json_encode($body));
    }

    public function test_the_public_list_does_not_leak_host_data_either(): void
    {
        $this->publishedAccommodation();

        $items = $this->getJson('/api/accommodations')->assertOk()->json('data');

        $this->assertNotEmpty($items);
        foreach ($items as $item) {
            $this->assertNothingPrivateIn($item['host']);
            $this->assertArrayNotHasKey('ical_import_url', $item);
        }
    }

    public function test_a_signed_in_traveler_gets_the_same_restricted_view(): void
    {
        [, $accommodation] = $this->publishedAccommodation();
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $response = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();

        $this->assertNothingPrivateIn($response->json('host'));
        $this->assertArrayNotHasKey('ical_import_url', $response->json());
    }

    public function test_the_owner_and_the_admin_keep_the_full_view(): void
    {
        [$host, $accommodation] = $this->publishedAccommodation();

        Sanctum::actingAs($host);
        $asOwner = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();
        $this->assertSame('hote.prive@example.com', $asOwner->json('host.email'));
        $this->assertSame('https://calendrier.example.com/secret-token-abc', $asOwner->json('ical_import_url'));

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $asAdmin = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk();
        $this->assertSame('hote.prive@example.com', $asAdmin->json('host.email'));
        $this->assertSame('https://calendrier.example.com/secret-token-abc', $asAdmin->json('ical_import_url'));
    }

    public function test_reviewers_still_show_only_their_name(): void
    {
        [, $accommodation] = $this->publishedAccommodation();
        $guest = User::factory()->create(['name' => 'Awa Koné', 'email' => 'awa.privee@example.com', 'phone' => '0505050505']);
        \App\Models\Review::create(['accommodation_id' => $accommodation->id, 'user_id' => $guest->id, 'rating' => 5, 'comment' => 'Très bon séjour']);

        $review = $this->getJson("/api/accommodations/{$accommodation->id}")->assertOk()->json('reviews.0');

        $this->assertSame('Awa Koné', $review['user']['name']);
        $this->assertStringNotContainsString('awa.privee@example.com', json_encode($review));
        $this->assertStringNotContainsString('0505050505', json_encode($review));
    }

    public function test_no_public_route_of_the_accommodation_leaks_private_data(): void
    {
        [$host, $accommodation] = $this->publishedAccommodation();
        $other = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published', 'city' => $accommodation->city, 'type' => $accommodation->type]);
        $room = \App\Models\Room::create(['accommodation_id' => $accommodation->id, 'name' => 'Chambre test', 'type' => 'double', 'capacity' => 2, 'price_per_night' => 20000, 'is_active' => true, 'quantity' => 1]);
        $guest = User::factory()->create(['email' => 'awa.privee@example.com', 'phone' => '0505050505', 'last_login_ip' => '102.67.1.1']);
        \App\Models\Review::create(['accommodation_id' => $accommodation->id, 'user_id' => $guest->id, 'rating' => 5, 'comment' => 'Très bon séjour']);

        $private = ['hote.prive@example.com', '0701020304', '41.66.12.34', 'google-12345', 'CI-TVA-9988', 'secret-token-abc', 'awa.privee@example.com', '0505050505', '102.67.1.1'];

        foreach ([
            '/api/accommodations',
            "/api/accommodations/{$accommodation->id}",
            "/api/accommodations/{$accommodation->id}/rooms",
            "/api/accommodations/{$accommodation->id}/rooms/{$room->id}",
            "/api/rooms/{$room->id}",
            "/api/accommodations/{$accommodation->id}/similar",
            "/api/accommodations/{$accommodation->id}/reviews",
            '/api/accommodations/suggestions?q=a',
            '/api/accommodations/top-cities',
        ] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();
            foreach ($private as $secret) {
                $this->assertStringNotContainsString($secret, $body, "$url expose « $secret »");
            }
        }
    }

    public function test_the_public_reviews_list_keeps_the_author_name_and_photo_only(): void
    {
        [, $accommodation] = $this->publishedAccommodation();
        $guest = User::factory()->create(['name' => 'Awa Koné', 'email' => 'awa.privee@example.com']);
        \App\Models\Review::create(['accommodation_id' => $accommodation->id, 'user_id' => $guest->id, 'rating' => 4, 'comment' => 'Bien', 'moderation_status' => 'approved']);

        $user = $this->getJson("/api/accommodations/{$accommodation->id}/reviews")->assertOk()->json('data.0.user');

        $this->assertSame('Awa Koné', $user['name']);
        $this->assertEqualsCanonicalizing(['id', 'name', 'avatar'], array_keys($user));
    }
}
