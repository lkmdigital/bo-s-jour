<?php

namespace Tests\Feature;

use App\Models\LoyaltyPointsTransaction;
use App\Models\ReferralPartner;
use App\Models\Setting;
use App\Models\User;
use App\Services\PartnerReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Parrainage ambassadeur (cahier des charges du 2026-11-09, palier 1) : QR code / lien traçable, clics uniques,
 * rattachement à l'inscription, +50 points à l'ambassadeur quand l'e-mail du filleul est vérifié.
 */
class PartnerReferralTest extends TestCase
{
    use RefreshDatabase;

    private function ambassador(string $code = 'CHEZMAMA'): ReferralPartner
    {
        $member = User::factory()->create(['role' => 'user']);

        return ReferralPartner::create(['user_id' => $member->id, 'code' => $code, 'display_name' => 'Chez Mama']);
    }

    private function registration(array $overrides = []): array
    {
        return $overrides + [
            'first_name' => 'Awa', 'last_name' => 'Koné', 'email' => 'awa@example.com', 'phone' => '0701020304',
            'password' => 'MotDePasse123', 'password_confirmation' => 'MotDePasse123', 'accept_terms' => true,
        ];
    }

    private function verifyEmail(string $email): void
    {
        $user = User::where('email', $email)->firstOrFail();
        $this->postJson('/api/auth/verify-otp', ['user_id' => $user->id, 'code' => $user->email_otp_code])->assertSuccessful();
    }

    // --- Administration ---------------------------------------------------------------------------------------

    public function test_an_admin_designates_a_member_as_ambassador(): void
    {
        $member = User::factory()->create(['role' => 'user', 'email' => 'mama@example.com']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson('/api/admin/referral-partners', ['email' => 'mama@example.com', 'display_name' => 'Chez Mama', 'code' => 'chezmama'])
            ->assertCreated()
            ->assertJsonPath('data.code', 'CHEZMAMA')
            ->assertJsonPath('data.link', config('services.frontend_url') . '/p/CHEZMAMA');

        $this->assertDatabaseHas('referral_partners', ['user_id' => $member->id, 'code' => 'CHEZMAMA', 'is_active' => true]);
    }

    public function test_a_code_is_generated_when_none_is_given(): void
    {
        User::factory()->create(['role' => 'user', 'email' => 'mama@example.com']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $code = $this->postJson('/api/admin/referral-partners', ['email' => 'mama@example.com'])->assertCreated()->json('data.code');

        $this->assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{8}$/', $code);
    }

    public function test_only_a_traveler_member_can_become_ambassador_once_and_codes_never_collide(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        User::factory()->create(['role' => 'host', 'email' => 'hote@example.com']);
        $member = User::factory()->create(['role' => 'user', 'email' => 'mama@example.com']);
        $other = User::factory()->create(['role' => 'user', 'email' => 'autre@example.com']);

        $this->postJson('/api/admin/referral-partners', ['email' => 'inconnu@example.com'])->assertStatus(422);
        $this->postJson('/api/admin/referral-partners', ['email' => 'hote@example.com'])->assertStatus(422);

        $this->postJson('/api/admin/referral-partners', ['email' => 'mama@example.com', 'code' => 'CHEZMAMA'])->assertCreated();
        $this->postJson('/api/admin/referral-partners', ['email' => 'mama@example.com', 'code' => 'AUTRE123'])->assertStatus(422);   // déjà ambassadeur
        $this->postJson('/api/admin/referral-partners', ['email' => 'autre@example.com', 'code' => 'CHEZMAMA'])->assertStatus(422);   // code pris
        $this->postJson('/api/admin/referral-partners', ['email' => 'autre@example.com', 'code' => $member->referral_code])->assertStatus(422);   // code d'un membre
        $this->postJson('/api/admin/referral-partners', ['email' => 'autre@example.com', 'code' => 'a b'])->assertStatus(422);   // format

        $this->assertNotNull($other->referral_code);
    }

    public function test_travelers_and_partners_cannot_manage_ambassadors(): void
    {
        foreach (['user', 'host'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->getJson('/api/admin/referral-partners')->assertStatus(403);
            $this->postJson('/api/admin/referral-partners', ['email' => 'x@example.com'])->assertStatus(403);
        }
    }

    public function test_an_admin_can_suspend_an_ambassador(): void
    {
        $partner = $this->ambassador();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->putJson("/api/admin/referral-partners/{$partner->id}", ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);

        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA'])->assertStatus(404);
    }

    // --- Clics et scans ---------------------------------------------------------------------------------------

    public function test_a_scan_is_counted_once_per_visitor_per_day_and_redirects_to_registration(): void
    {
        $partner = $this->ambassador();

        $this->postJson('/api/referral/click', ['code' => 'chezmama'])->assertOk()->assertJsonPath('redirect', '/auth/register?ref=CHEZMAMA');
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA'])->assertOk();   // même visiteur, même jour
        $this->assertSame(1, $partner->clicks()->count());

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])->postJson('/api/referral/click', ['code' => 'CHEZMAMA'])->assertOk();   // autre visiteur
        $this->assertSame(2, $partner->clicks()->count());

        $this->travel(1)->days();   // le même visiteur revenu le lendemain : un nouveau clic, mais le même visiteur unique
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA'])->assertOk();
        $this->assertSame(3, $partner->clicks()->count());
        $this->assertSame(2, app(PartnerReferralService::class)->stats($partner)['clicks'], 'les clics uniques comptent les visiteurs, pas les passages');
    }

    public function test_an_unknown_code_is_not_counted(): void
    {
        $this->postJson('/api/referral/click', ['code' => 'NEXISTEPAS'])->assertStatus(404);
    }

    public function test_the_registration_form_can_tell_an_ambassador_code_from_a_member_code(): void
    {
        $this->ambassador();
        $member = User::factory()->create(['role' => 'user']);

        $this->getJson('/api/referral/resolve/chezmama')->assertOk()->assertJson(['valid' => true, 'type' => 'partner', 'label' => 'Chez Mama']);
        $this->getJson('/api/referral/resolve/' . $member->referral_code)->assertOk()->assertJson(['valid' => true, 'type' => 'member', 'label' => null]);
        $this->getJson('/api/referral/resolve/ZZZZZZZZ')->assertOk()->assertJson(['valid' => false]);
    }

    // --- Inscription : palier 1 -------------------------------------------------------------------------------

    public function test_the_ambassador_gets_50_points_once_the_signup_is_validated_not_before(): void
    {
        $partner = $this->ambassador();

        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => 'CHEZMAMA']))->assertCreated();

        $filleul = User::where('email', 'awa@example.com')->first();
        $this->assertDatabaseHas('referral_partner_referrals', ['referral_partner_id' => $partner->id, 'user_id' => $filleul->id, 'signup_validated_at' => null]);
        $this->assertSame(0, (int) $partner->user->fresh()->loyalty_points_balance, 'pas de points avant la vérification');
        $this->assertNull($filleul->referred_by_user_id, "un code d'ambassadeur n'ouvre pas le parrainage entre membres");

        $this->verifyEmail('awa@example.com');

        $this->assertSame(50, (int) $partner->user->fresh()->loyalty_points_balance);
        $this->assertDatabaseHas('loyalty_points_transactions', [
            'user_id' => $partner->user_id, 'points' => 50, 'type' => LoyaltyPointsTransaction::TYPE_PARTNER_SIGNUP,
        ]);
        $this->assertSame(50, ReferralPartnerReferralFor($filleul)->signup_points);

        $this->verifyEmailAgain($filleul);
        $this->assertSame(50, (int) $partner->user->fresh()->loyalty_points_balance, 'jamais crédité deux fois');
    }

    private function verifyEmailAgain(User $user): void
    {
        app(PartnerReferralService::class)->onEmailVerified($user);
    }

    public function test_the_signup_bonus_amount_follows_the_admin_setting(): void
    {
        Setting::set('loyalty_partner_signup_points', 70, 'number');
        $partner = $this->ambassador();

        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => 'CHEZMAMA']))->assertCreated();
        $this->verifyEmail('awa@example.com');

        $this->assertSame(70, (int) $partner->user->fresh()->loyalty_points_balance);
    }

    public function test_an_ambassador_cannot_sponsor_themselves(): void
    {
        $partner = $this->ambassador();

        $this->assertNull(app(PartnerReferralService::class)->attach($partner, $partner->user));
        $this->assertSame(0, $partner->referrals()->count());
    }

    public function test_a_member_code_keeps_the_member_to_member_path(): void
    {
        $this->ambassador();
        $sponsor = User::factory()->create(['role' => 'user']);

        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => $sponsor->referral_code]))->assertCreated();
        $this->verifyEmail('awa@example.com');

        $this->assertSame($sponsor->id, User::where('email', 'awa@example.com')->value('referred_by_user_id'));
        $this->assertSame(0, (int) $sponsor->fresh()->loyalty_points_balance, 'les points des membres restent dus après le séjour');
        $this->assertDatabaseCount('referral_partner_referrals', 0);
    }

    // --- Tableau de bord --------------------------------------------------------------------------------------

    public function test_the_ambassador_sees_the_short_link_and_live_counters_on_the_loyalty_page(): void
    {
        $partner = $this->ambassador();
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA']);
        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => 'CHEZMAMA']))->assertCreated();
        $this->verifyEmail('awa@example.com');
        Sanctum::actingAs($partner->user->fresh());

        $block = $this->getJson('/api/me/loyalty')->assertOk()->json('data.ambassador');

        $this->assertSame('CHEZMAMA', $block['code']);
        $this->assertSame(config('services.frontend_url') . '/p/CHEZMAMA', $block['link']);
        $this->assertSame(1, $block['stats']['clicks']);
        $this->assertSame(1, $block['stats']['signups']);
        $this->assertSame(1, $block['stats']['signups_validated']);
        $this->assertSame(50, $block['stats']['points_awarded']);
        $this->assertEquals(100, $block['stats']['conversion_signup']);
        $this->assertEquals(0, $block['stats']['conversion_booking']);
    }

    public function test_an_ordinary_member_has_no_ambassador_block(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->assertNull($this->getJson('/api/me/loyalty')->assertOk()->json('data.ambassador'));
    }
}

function ReferralPartnerReferralFor(User $user): \App\Models\ReferralPartnerReferral
{
    return \App\Models\ReferralPartnerReferral::where('user_id', $user->id)->firstOrFail();
}
