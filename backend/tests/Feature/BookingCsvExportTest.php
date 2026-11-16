<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Export CSV des réservations : admin (toutes, filtres de la page) et partenaire (les siennes). */
class BookingCsvExportTest extends TestCase
{
    use RefreshDatabase;

    private function booking(Accommodation $acc, array $attrs = [], ?User $traveler = null): Booking
    {
        return Booking::factory()->for($traveler ?? User::factory()->create(['role' => 'user', 'name' => 'Awa Koné']))->create(array_merge([
            'accommodation_id' => $acc->id, 'room_id' => null, 'status' => 'confirmed', 'payment_status' => 'paid',
            'total_price' => 44000, 'base_price' => 46000, 'amount_paid' => 44000, 'booking_number' => 'BS-2026-000001', 'confirmation_code' => strtoupper(substr(md5(uniqid('', true)), 0, 8)),
            'check_in' => '2026-12-10', 'check_out' => '2026-12-12', 'guests' => 2,
        ], $attrs));
    }

    private function rows(string $content): array
    {
        $lines = array_values(array_filter(preg_split('/\r?\n/', ltrim($content, "\xEF\xBB\xBF"))));

        return array_map(fn ($l) => str_getcsv($l, ';'), $lines);
    }

    public function test_the_admin_exports_every_filtered_reservation_not_only_one_page(): void
    {
        $acc = Accommodation::factory()->create(['status' => 'published', 'name' => 'Résidence Test', 'city' => 'Korhogo']);
        foreach (range(1, 25) as $i) {
            $this->booking($acc, ['booking_number' => sprintf('BS-%06d', $i), 'created_at' => now()->subMinutes($i)]);
        }
        $this->booking($acc, ['status' => 'cancelled', 'booking_number' => 'BS-ANNULEE']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $all = $this->get('/api/admin/bookings/export');
        $all->assertOk();
        $this->assertStringStartsWith('text/csv', $all->headers->get('Content-Type'));
        $this->assertStringContainsString('reservations-' . now()->format('Y-m-d') . '.csv', $all->headers->get('Content-Disposition'));
        $this->assertStringStartsWith("\xEF\xBB\xBF", $all->streamedContent(), 'BOM UTF-8 pour Excel');
        $this->assertCount(1 + 26, $this->rows($all->streamedContent()), 'en-tête + les 26 réservations, au-delà des 20 d\'une page');

        $cancelled = $this->rows($this->get('/api/admin/bookings/export?status=cancelled')->streamedContent());
        $this->assertCount(2, $cancelled);
        $this->assertSame('BS-ANNULEE', $cancelled[1][0]);
    }

    public function test_the_admin_columns_carry_client_establishment_status_and_amounts(): void
    {
        $acc = Accommodation::factory()->create(['status' => 'published', 'name' => 'Résidence Test', 'city' => 'Korhogo']);
        $this->booking($acc, ['confirmation_code' => 'AB12CD34']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $rows = $this->rows($this->get('/api/admin/bookings/export')->streamedContent());
        $row = array_combine($rows[0], $rows[1]);

        $this->assertSame('BS-2026-000001', $row['N° réservation']);
        $this->assertSame('AB12CD34', $row['Code de confirmation']);
        $this->assertSame('Awa Koné', $row['Client']);
        $this->assertSame('Résidence Test', $row['Établissement']);
        $this->assertSame('Korhogo', $row['Ville']);
        $this->assertSame('10/12/2026', $row['Arrivée']);
        $this->assertSame('2', $row['Nuits']);
        $this->assertSame('Confirmée', $row['Statut']);
        $this->assertSame('Payé intégralement', $row['Paiement']);
        $this->assertSame('46000', $row['Tarif plein (FCFA)']);
        $this->assertSame('2000', $row['Remise (FCFA)']);
        $this->assertSame('44000', $row['Total à payer (FCFA)']);
        $this->assertSame('44000', $row['Encaissé (FCFA)']);
        $this->assertSame('0', $row['Reste à payer (FCFA)']);
    }

    public function test_cells_that_look_like_formulas_are_neutralised(): void
    {
        $acc = Accommodation::factory()->create(['status' => 'published']);
        $this->booking($acc, [], User::factory()->create(['role' => 'user', 'name' => '=HYPERLINK("http://evil","clic")', 'email' => 'x@example.com']));
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $rows = $this->rows($this->get('/api/admin/bookings/export')->streamedContent());

        $this->assertStringStartsWith("'=HYPERLINK", array_combine($rows[0], $rows[1])['Client']);
    }

    public function test_only_admins_can_use_the_admin_export(): void
    {
        foreach (['user', 'host'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->getJson('/api/admin/bookings/export')->assertStatus(403);
        }
    }

    public function test_a_partner_exports_only_his_own_reservations(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $mine = Accommodation::factory()->create(['status' => 'published', 'host_id' => $host->id, 'name' => 'Chez moi']);
        $theirs = Accommodation::factory()->create(['status' => 'published', 'name' => 'Chez un autre']);
        $this->booking($mine, ['booking_number' => 'BS-MINE']);
        $this->booking($theirs, ['booking_number' => 'BS-THEIRS']);
        Sanctum::actingAs($host);

        $response = $this->get('/api/bookings/host/export');

        $response->assertOk();
        $rows = $this->rows($response->streamedContent());
        $this->assertCount(2, $rows);
        $this->assertSame('BS-MINE', $rows[1][0]);
        $this->assertNotContains('Chez un autre', array_merge(...$rows));
        $this->assertNotContains('Tarif plein (FCFA)', $rows[0], 'pas de colonnes réservées à l\'administration');
    }

    public function test_the_partner_export_follows_the_page_filters_and_hides_unconfirmed_cancellations(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $acc = Accommodation::factory()->create(['status' => 'published', 'host_id' => $host->id]);
        $this->booking($acc, ['booking_number' => 'BS-OK']);
        $this->booking($acc, ['status' => 'pending', 'payment_status' => 'pending', 'booking_number' => 'BS-PENDING', 'confirmation_code' => null]);
        $this->booking($acc, ['status' => 'cancelled', 'payment_status' => 'pending', 'booking_number' => null, 'confirmation_code' => null]);   // jamais confirmée : invisible pour le partenaire
        Sanctum::actingAs($host);

        $this->assertCount(3, $this->rows($this->get('/api/bookings/host/export')->streamedContent()), 'en-tête + 2 visibles');
        $pending = $this->rows($this->get('/api/bookings/host/export?status=pending')->streamedContent());
        $this->assertCount(2, $pending);
        $this->assertSame('BS-PENDING', $pending[1][0]);
    }

    public function test_a_traveler_cannot_use_the_partner_export(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/bookings/host/export')->assertStatus(403);
    }
}
