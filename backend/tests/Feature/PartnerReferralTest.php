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

        $this->postJson('/api/admin/referral-partners', ['email' => 'hote@example.com'])->assertStatus(422);   // compte hôte : refusé
        $this->postJson('/api/admin/referral-partners', [])->assertStatus(422);   // ni e-mail ni numéro

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

    // --- Ambassadeur désigné avant son inscription ------------------------------------------------------------

    private function designate(array $payload): \Illuminate\Testing\TestResponse
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        return $this->postJson('/api/admin/referral-partners', $payload);
    }

    public function test_an_ambassador_can_be_designated_by_email_before_creating_an_account(): void
    {
        $this->designate(['email' => 'Mama@Example.com', 'display_name' => 'Chez Mama', 'code' => 'CHEZMAMA'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_account')
            ->assertJsonPath('data.user', null)
            ->assertJsonPath('data.invited_email', 'mama@example.com')
            ->assertJsonPath('data.link', config('services.frontend_url') . '/p/CHEZMAMA');

        // Son QR code fonctionne déjà : les scans sont comptés et les inscrits rattachés, avant même qu'il ait un compte.
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA'])->assertOk();
        $this->assertSame(1, ReferralPartner::where('code', 'CHEZMAMA')->first()->clicks()->count());
    }

    public function test_the_same_email_or_number_cannot_be_designated_twice(): void
    {
        $this->designate(['email' => 'mama@example.com', 'phone' => '+225 07 01 02 03 04'])->assertCreated();

        $this->designate(['email' => 'mama@example.com'])->assertStatus(422);
        $this->designate(['phone' => '0701020304'])->assertStatus(422);   // même numéro, écrit autrement
        $this->designate(['phone' => '123'])->assertStatus(422);          // numéro incomplet
    }

    public function test_an_existing_member_designated_by_email_or_whatsapp_is_linked_immediately(): void
    {
        $byEmail = User::factory()->create(['role' => 'user', 'email' => 'mama@example.com']);
        $byPhone = User::factory()->create(['role' => 'user', 'phone' => '+22507 11 22 33 44']);

        $this->designate(['email' => 'mama@example.com'])->assertCreated()->assertJsonPath('data.status', 'active_account')->assertJsonPath('data.user.id', $byEmail->id);
        $this->designate(['phone' => '0711223344'])->assertCreated()->assertJsonPath('data.user.id', $byPhone->id);
    }

    public function test_the_designated_person_finds_everything_when_they_create_their_account(): void
    {
        $this->designate(['email' => 'mama@example.com', 'code' => 'CHEZMAMA', 'display_name' => 'Chez Mama'])->assertCreated();
        $partner = ReferralPartner::where('code', 'CHEZMAMA')->first();

        // Un client s'inscrit via son QR code et valide son compte AVANT que l'ambassadeur n'ait créé le sien.
        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => 'CHEZMAMA']))->assertCreated();
        $this->verifyEmail('awa@example.com');
        $this->assertNull($partner->fresh()->user_id);
        $this->assertSame(50, \App\Models\ReferralPartnerReferral::first()->signup_points, 'les points sont gagnés et mis de côté');
        $this->assertNull(\App\Models\ReferralPartnerReferral::first()->signup_credited_at);

        // Il crée enfin son compte (non vérifié : rien ne change), puis vérifie son e-mail.
        $this->postJson('/api/auth/register-traveler', $this->registration(['first_name' => 'Mama', 'email' => 'mama@example.com', 'phone' => '0799887766']))->assertCreated();
        $this->assertNull($partner->fresh()->user_id, 'un compte non vérifié ne prend pas la place');
        $this->verifyEmail('mama@example.com');

        $mama = User::where('email', 'mama@example.com')->first();
        $this->assertSame($mama->id, $partner->fresh()->user_id);
        $this->assertSame(50, (int) $mama->fresh()->loyalty_points_balance, 'il retrouve les points déjà gagnés par son réseau');

        Sanctum::actingAs($mama->fresh());
        $block = $this->getJson('/api/me/loyalty')->assertOk()->json('data.ambassador');
        $this->assertSame('CHEZMAMA', $block['code']);
        $this->assertSame(1, $block['stats']['signups_validated']);
    }

    public function test_the_designated_person_is_recognised_by_whatsapp_number_whatever_the_format(): void
    {
        $this->designate(['phone' => '+225 07 01 02 03 04', 'code' => 'CHEZMAMA'])->assertCreated();

        $this->postJson('/api/auth/register-traveler', $this->registration(['email' => 'mama@example.com', 'phone' => '0701020304']))->assertCreated();
        $this->verifyEmail('mama@example.com');

        $this->assertSame(User::where('email', 'mama@example.com')->value('id'), ReferralPartner::where('code', 'CHEZMAMA')->value('user_id'));
    }

    public function test_someone_else_with_another_email_and_number_does_not_take_the_place(): void
    {
        $this->designate(['email' => 'mama@example.com', 'phone' => '0701020304', 'code' => 'CHEZMAMA'])->assertCreated();

        $this->postJson('/api/auth/register-traveler', $this->registration(['email' => 'autre@example.com', 'phone' => '0555555555']))->assertCreated();
        $this->verifyEmail('autre@example.com');

        $this->assertNull(ReferralPartner::where('code', 'CHEZMAMA')->value('user_id'));
    }

    public function test_a_designated_person_cannot_be_their_own_sponsor_through_their_own_link(): void
    {
        $this->designate(['email' => 'mama@example.com', 'code' => 'CHEZMAMA'])->assertCreated();

        $this->postJson('/api/auth/register-traveler', $this->registration(['email' => 'mama@example.com', 'referral_code' => 'CHEZMAMA']))->assertCreated();
        $this->verifyEmail('mama@example.com');

        $mama = User::where('email', 'mama@example.com')->first();
        $this->assertSame($mama->id, ReferralPartner::where('code', 'CHEZMAMA')->value('user_id'));
        $this->assertSame(0, \App\Models\ReferralPartnerReferral::count());
        $this->assertSame(0, (int) $mama->fresh()->loyalty_points_balance);
    }

}

function ReferralPartnerReferralFor(User $user): \App\Models\ReferralPartnerReferral
{
    return \App\Models\ReferralPartnerReferral::where('user_id', $user->id)->firstOrFail();
}
