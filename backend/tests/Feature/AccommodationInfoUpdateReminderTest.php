<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Demande utilisateur 2026-09-13/14 : "rajoute une logique de rappel de mise
 * à jour des informations pour les établissements non à jour". Couvre le
 * modèle (Accommodation::needsInfoUpdate), les 2 points d'entrée qui
 * reconfirment les informations (édition + confirmation explicite), et la
 * commande planifiée qui envoie les relances.
 */
class AccommodationInfoUpdateReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_freshly_created_accommodation_does_not_need_an_update(): void
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);

        $this->assertFalse($accommodation->needsInfoUpdate());
    }

    public function test_an_accommodation_never_confirmed_and_older_than_the_threshold_needs_an_update(): void
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'created_at' => now()->subMonths(7),
            'info_confirmed_at' => null,
        ]);

        $this->assertTrue($accommodation->needsInfoUpdate());
    }

    public function test_an_accommodation_confirmed_recently_does_not_need_an_update_even_if_old(): void
    {
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'created_at' => now()->subYears(2),
            'info_confirmed_at' => now()->subMonth(),
        ]);

        $this->assertFalse($accommodation->needsInfoUpdate());
    }

    public function test_editing_the_accommodation_content_confirms_it_is_up_to_date(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create([
            'host_id' => $host->id,
            'status' => 'published',
            'info_confirmed_at' => now()->subMonths(7),
        ]);
        Sanctum::actingAs($host);

        $this->putJson("/api/accommodations/{$accommodation->id}", ['description' => 'Description mise à jour.'])
            ->assertOk();

        $this->assertFalse($accommodation->fresh()->needsInfoUpdate());
    }

    public function test_changing_only_the_status_does_not_count_as_confirming_the_content(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create([
            'host_id' => $host->id,
            'status' => 'published',
            'info_confirmed_at' => now()->subMonths(7),
        ]);
        Sanctum::actingAs($host);

        // 'pending' : seul statut qu'un hôte non-admin est autorisé à poser
        // lui-même (published/rejected sont réservés à l'admin) ET présent
        // dans la contrainte CHECK enum d'origine de SQLite (tests) — les
        // migrations qui ajoutent unavailable/renovation/removed/disabled
        // sont des ALTER MySQL, sans effet sur SQLite, donc ces valeurs n'y
        // sont pas utilisables ; limite préexistante de l'environnement de
        // test, sans effet en prod (MySQL). Seul le NOM du champ envoyé
        // compte pour la logique testée ici, peu importe la valeur.
        $this->putJson("/api/accommodations/{$accommodation->id}", ['status' => 'pending'])->assertOk();

        $this->assertTrue($accommodation->fresh()->needsInfoUpdate());
    }

    public function test_host_can_explicitly_confirm_their_information_without_changing_anything(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create([
            'host_id' => $host->id,
            'status' => 'published',
            'info_confirmed_at' => now()->subMonths(7),
        ]);
        Sanctum::actingAs($host);

        $this->postJson("/api/accommodations/{$accommodation->id}/confirm-info")->assertOk();

        $this->assertFalse($accommodation->fresh()->needsInfoUpdate());
    }

    public function test_a_host_cannot_confirm_another_hosts_accommodation(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $otherHost = User::factory()->create(['role' => 'host']);
        $accommodation = Accommodation::factory()->create(['host_id' => $otherHost->id, 'status' => 'published']);
        Sanctum::actingAs($host);

        $this->postJson("/api/accommodations/{$accommodation->id}/confirm-info")->assertStatus(403);
    }

    public function test_my_accommodations_exposes_needs_info_update_flag(): void
    {
        $host = User::factory()->create(['role' => 'host']);
        $stale = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published', 'created_at' => now()->subMonths(8)]);
        $fresh = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published']);
        Sanctum::actingAs($host);

        $res = $this->getJson('/api/accommodations/my')->assertOk();

        $byId = collect($res->json())->keyBy('id');
        $this->assertTrue($byId[$stale->id]['needs_info_update']);
        $this->assertFalse($byId[$fresh->id]['needs_info_update']);
    }

    public function test_the_reminder_command_notifies_hosts_of_stale_published_accommodations_only(): void
    {
        Mail::fake();
        $stale = Accommodation::factory()->create(['status' => 'published', 'created_at' => now()->subMonths(8)]);
        $fresh = Accommodation::factory()->create(['status' => 'published', 'created_at' => now()->subMonth()]);
        $stalePending = Accommodation::factory()->create(['status' => 'pending', 'created_at' => now()->subMonths(8)]);

        $this->artisan('accommodations:remind-info-update')->assertSuccessful();

        $this->assertNotNull(Message::where('recipient_id', $stale->host_id)->where('subject', 'Merci de confirmer les informations de votre établissement')->first());
        $this->assertNull(Message::where('recipient_id', $fresh->host_id)->first());
        $this->assertNull(Message::where('recipient_id', $stalePending->host_id)->first());
        Mail::assertSent(\App\Mail\AccommodationInfoUpdateReminder::class, 1);

        $this->assertNotNull($stale->fresh()->info_update_reminder_sent_at);
    }

    public function test_the_reminder_command_does_not_resend_within_the_minimum_delay(): void
    {
        Mail::fake();
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'created_at' => now()->subMonths(8),
            'info_update_reminder_sent_at' => now()->subDays(5),
        ]);

        $this->artisan('accommodations:remind-info-update');

        Mail::assertNothingSent();
        $this->assertSame(0, Message::where('recipient_id', $accommodation->host_id)->count());
    }

    public function test_the_reminder_command_resends_after_the_minimum_delay_has_passed(): void
    {
        Mail::fake();
        $accommodation = Accommodation::factory()->create([
            'status' => 'published',
            'created_at' => now()->subMonths(8),
            'info_update_reminder_sent_at' => now()->subDays(31),
        ]);

        $this->artisan('accommodations:remind-info-update');

        Mail::assertSent(\App\Mail\AccommodationInfoUpdateReminder::class, 1);
        $this->assertNotNull(Message::where('recipient_id', $accommodation->host_id)->first());
    }
}
