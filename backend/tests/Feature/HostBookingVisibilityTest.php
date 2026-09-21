<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-18 : le partenaire ne voit que les réservations menées
 * jusqu'au bout (en attente de validation, validées, confirmées/en cours,
 * terminées) — pas les demandes abandonnées, expirées ou annulées avant
 * confirmation.
 */
class HostBookingVisibilityTest extends TestCase
{
    use RefreshDatabase;

    private function make(Accommodation $acc, string $status, array $extra = []): Booking
    {
        return Booking::factory()->for(User::factory()->create())->create(array_merge([
            'accommodation_id' => $acc->id,
            'status' => $status,
            'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(),
        ], $extra));
    }

    public function test_host_only_sees_bookings_that_went_all_the_way(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $acc = Accommodation::factory()->create(['status' => 'published', 'host_id' => $host->id]);

        $visible = [
            $this->make($acc, 'awaiting_host_confirmation')->id,
            $this->make($acc, 'pending')->id,
            $this->make($acc, 'confirmed', ['confirmation_code' => 'ABC123'])->id,
            $this->make($acc, 'completed')->id,
            $this->make($acc, 'cancelled', ['confirmation_code' => 'XYZ789'])->id,
        ];
        $this->make($acc, 'cancelled'); // annulée/expirée avant confirmation

        Sanctum::actingAs($host);
        $ids = collect($this->getJson('/api/bookings?per_page=50')->assertOk()->json('data'))->pluck('id')->all();

        $this->assertEqualsCanonicalizing($visible, $ids);
    }

    public function test_in_progress_and_finished_filters_are_derived_from_dates(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $acc = Accommodation::factory()->create(['status' => 'published', 'host_id' => $host->id]);

        $inProgress = $this->make($acc, 'confirmed', ['check_in' => now()->subDay()->toDateString(), 'check_out' => now()->addDay()->toDateString()]);
        $finishedConfirmed = $this->make($acc, 'confirmed', ['check_in' => now()->subDays(6)->toDateString(), 'check_out' => now()->subDays(4)->toDateString()]);
        $finishedCompleted = $this->make($acc, 'completed');
        $this->make($acc, 'confirmed'); // à venir

        Sanctum::actingAs($host);

        $this->assertSame([$inProgress->id], collect($this->getJson('/api/bookings?status=in_progress')->json('data'))->pluck('id')->all());
        $this->assertEqualsCanonicalizing(
            [$finishedConfirmed->id, $finishedCompleted->id],
            collect($this->getJson('/api/bookings?status=finished')->json('data'))->pluck('id')->all()
        );
    }
}
