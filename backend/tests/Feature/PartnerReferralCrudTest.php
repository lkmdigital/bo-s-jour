<?php

namespace Tests\Feature;

use App\Models\ReferralPartner;
use App\Models\ReferralPartnerClick;
use App\Models\ReferralPartnerReferral;
use App\Models\User;
use App\Services\PartnerReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Gestion complète des ambassadeurs par l'administrateur : créer, lire, modifier (dont le code), suspendre, supprimer. */
class PartnerReferralCrudTest extends TestCase
{
    use RefreshDatabase;

    private function partner(string $code = 'CHEZMAMA'): ReferralPartner
    {
        return ReferralPartner::create(['user_id' => User::factory()->create(['role' => 'user'])->id, 'code' => $code, 'display_name' => 'Chez Mama']);
    }

    private function asAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    // --- Modifier -----------------------------------------------------------------------------------------------

    public function test_the_code_can_be_changed_to_a_free_one(): void
    {
        $partner = $this->partner();
        $this->asAdmin();

        $this->putJson("/api/admin/referral-partners/{$partner->id}", ['code' => 'mamaresto'])
            ->assertOk()->assertJsonPath('data.code', 'MAMARESTO')->assertJsonPath('data.link', config('services.frontend_url') . '/p/MAMARESTO');

        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA'])->assertStatus(404);   // l'ancien code ne fonctionne plus
        $this->postJson('/api/referral/click', ['code' => 'MAMARESTO'])->assertOk();
    }

    public function test_a_code_already_used_or_badly_formed_is_refused_but_keeping_ones_own_is_fine(): void
    {
        $partner = $this->partner();
        $other = $this->partner('AUTRE123');
        $member = User::factory()->create(['role' => 'user']);
        $this->asAdmin();
        $url = "/api/admin/referral-partners/{$partner->id}";

        $this->putJson($url, ['code' => $other->code])->assertStatus(422)->assertJsonValidationErrors('code');
        $this->putJson($url, ['code' => $member->referral_code])->assertStatus(422);
        $this->putJson($url, ['code' => 'a b'])->assertStatus(422);
        $this->putJson($url, ['code' => 'abc'])->assertStatus(422);
        $this->putJson($url, ['code' => 'chezmama', 'display_name' => 'Chez Mama 2'])->assertOk()->assertJsonPath('data.display_name', 'Chez Mama 2');
    }

    public function test_the_list_returns_the_notes_for_editing(): void
    {
        $partner = $this->partner();
        $partner->update(['notes' => 'À rappeler en janvier']);
        $this->asAdmin();

        $this->getJson('/api/admin/referral-partners')->assertOk()->assertJsonPath('data.0.notes', 'À rappeler en janvier');
    }

    // --- Supprimer ----------------------------------------------------------------------------------------------

    public function test_an_ambassador_without_clients_is_deleted_straight_away(): void
    {
        $partner = $this->partner();
        ReferralPartnerClick::create(['referral_partner_id' => $partner->id, 'visitor_hash' => 'x']);
        $this->asAdmin();

        $this->deleteJson("/api/admin/referral-partners/{$partner->id}")->assertOk();

        $this->assertDatabaseMissing('referral_partners', ['id' => $partner->id]);
        $this->assertSame(0, ReferralPartnerClick::count(), 'ses visites sont supprimées avec lui');
        $this->assertNotNull(User::find($partner->user_id), 'le compte membre est conservé');
    }

    public function test_deleting_an_ambassador_with_clients_needs_a_confirmation_that_says_what_is_lost(): void
    {
        $partner = $this->partner();
        $filleul = User::factory()->create(['role' => 'user', 'email_verified_at' => null]);
        app(PartnerReferralService::class)->attach($partner, $filleul);
        $filleul->update(['email_verified_at' => now()]);
        $this->asAdmin();

        $this->deleteJson("/api/admin/referral-partners/{$partner->id}")
            ->assertStatus(409)
            ->assertJson(['requires_confirmation' => true, 'referrals' => 1, 'points_awarded' => 50]);
        $this->assertDatabaseHas('referral_partners', ['id' => $partner->id]);
    }

    public function test_a_confirmed_deletion_keeps_accounts_points_and_bookings(): void
    {
        $partner = $this->partner();
        $filleul = User::factory()->create(['role' => 'user', 'email_verified_at' => null]);
        $referral = app(PartnerReferralService::class)->attach($partner, $filleul);
        $filleul->update(['email_verified_at' => now()]);
        $this->assertSame(50, (int) $partner->user->fresh()->loyalty_points_balance);
        $booking = \App\Models\Booking::factory()->for($filleul)->create([
            'accommodation_id' => \App\Models\Accommodation::factory()->create()->id,
            'partner_referral_id' => $referral->id, 'referral_discount_amount' => 1500,
        ]);
        $this->asAdmin();

        $this->deleteJson("/api/admin/referral-partners/{$partner->id}?force=1")->assertOk();

        $this->assertDatabaseMissing('referral_partners', ['id' => $partner->id]);
        $this->assertSame(0, ReferralPartnerReferral::count());
        $this->assertNotNull(User::find($filleul->id));
        $this->assertSame(50, (int) $partner->user->fresh()->loyalty_points_balance, 'les points déjà versés restent acquis');
        $fresh = $booking->fresh();
        $this->assertNull($fresh->partner_referral_id);
        $this->assertEquals(1500, $fresh->referral_discount_amount, 'la remise accordée reste visible pour la comptabilité');
    }

    public function test_only_admins_can_delete(): void
    {
        $partner = $this->partner();
        foreach (['user', 'host'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->deleteJson("/api/admin/referral-partners/{$partner->id}?force=1")->assertStatus(403);
        }
        $this->assertDatabaseHas('referral_partners', ['id' => $partner->id]);

        $this->asAdmin();
        $this->deleteJson('/api/admin/referral-partners/9999')->assertStatus(404);
    }

    public function test_a_deleted_code_becomes_free_again(): void
    {
        $partner = $this->partner();
        $this->asAdmin();
        $this->deleteJson("/api/admin/referral-partners/{$partner->id}")->assertOk();
        User::factory()->create(['role' => 'user', 'email' => 'neuve@example.com']);

        $this->postJson('/api/admin/referral-partners', ['email' => 'neuve@example.com', 'code' => 'CHEZMAMA'])->assertCreated();
    }
}
