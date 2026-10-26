<?php

namespace Tests\Feature;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Réactivation (2026-10-26) des tâches planifiées restées mortes depuis la migration Laravel 11 : aucune
 * rafale de relances finales, et pas de demande d'avis pour de vieux séjours.
 */
class ReminderReactivationTest extends TestCase
{
    use RefreshDatabase;

    private function oldUsers(): array
    {
        $guest = User::factory()->create(['is_guest' => true, 'role' => 'user', 'created_at' => now()->subDays(5), 'activation_reminder_stage' => 0]);
        $host = User::factory()->create(['role' => 'host', 'created_at' => now()->subDays(100), 'last_login_at' => now()->subDays(40), 'host_onboarding_reminder_stage' => 0, 'compliance_reminder_stage' => 0]);

        return [$guest, $host];
    }

    public function test_fast_forward_aligns_the_counters_without_sending_anything(): void
    {
        Mail::fake();
        [$guest, $host] = $this->oldUsers();

        $this->artisan('reminders:fast-forward')->assertSuccessful();

        $this->assertSame(3, $guest->fresh()->activation_reminder_stage);
        $this->assertSame(3, $host->fresh()->host_onboarding_reminder_stage);
        $this->assertSame(3, $host->fresh()->compliance_reminder_stage);
        Mail::assertNothingSent();
        Mail::assertNothingQueued();
    }

    public function test_after_the_fast_forward_the_reminder_commands_send_nothing_to_existing_accounts(): void
    {
        Mail::fake();
        $this->oldUsers();
        $this->artisan('reminders:fast-forward')->assertSuccessful();

        $this->artisan('users:remind-guest-activation')->assertSuccessful();
        $this->artisan('hosts:remind-onboarding')->assertSuccessful();
        $this->artisan('compliance:remind-hosts')->assertSuccessful();

        Mail::assertNothingSent();
    }

    public function test_without_the_fast_forward_the_same_accounts_would_get_their_final_reminder_at_once(): void
    {
        Mail::fake();
        $this->oldUsers();

        $this->artisan('users:remind-guest-activation')->assertSuccessful();
        $this->artisan('hosts:remind-onboarding')->assertSuccessful();

        // Preuve du risque évité : sans alignement, la relance finale partirait immédiatement.
        $this->assertCount(2, Mail::sent(\Illuminate\Mail\Mailable::class)->merge(collect()));
    }

    public function test_dry_run_changes_nothing(): void
    {
        [$guest] = $this->oldUsers();

        $this->artisan('reminders:fast-forward', ['--dry-run' => true])->expectsOutputToContain('seraient alignés')->assertSuccessful();

        $this->assertSame(0, $guest->fresh()->activation_reminder_stage);
    }

    public function test_new_accounts_still_follow_their_normal_schedule_after_the_fast_forward(): void
    {
        Mail::fake();
        $this->artisan('reminders:fast-forward')->assertSuccessful();
        $newGuest = User::factory()->create(['is_guest' => true, 'role' => 'user', 'created_at' => now()->subHours(3), 'activation_reminder_stage' => 0]);

        $this->artisan('users:remind-guest-activation')->assertSuccessful();

        $this->assertSame(1, $newGuest->fresh()->activation_reminder_stage, 'un compte de 3 h reçoit bien sa première relance');
    }

    public function test_review_links_are_only_sent_for_recent_stays(): void
    {
        $accommodation = Accommodation::factory()->create();
        $recent = Booking::factory()->create(['accommodation_id' => $accommodation->id, 'status' => 'confirmed', 'check_in' => now()->subDays(5)->toDateString(), 'check_out' => now()->subDays(3)->toDateString(), 'review_link_sent_at' => null]);
        $old = Booking::factory()->create(['accommodation_id' => $accommodation->id, 'status' => 'confirmed', 'check_in' => now()->subDays(100)->toDateString(), 'check_out' => now()->subDays(98)->toDateString(), 'review_link_sent_at' => null]);

        $this->artisan('reviews:send-post-stay-links', ['--dry-run' => true])
            ->expectsOutputToContain("booking #{$recent->id}")
            ->doesntExpectOutputToContain("booking #{$old->id}")
            ->assertSuccessful();
    }
}
