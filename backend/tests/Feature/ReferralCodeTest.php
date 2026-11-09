<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\ReferralCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Parrainage : le code est créé dès l'inscription (plus besoin d'ouvrir « Mon programme »), et il se partage de trois façons :
 * le code, un lien d'inscription qui le préremplit, et un QR code (affiché par le site, qui encode ce lien).
 */
class ReferralCodeTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return $overrides + [
            'first_name' => 'Awa', 'last_name' => 'Koné', 'email' => 'awa@example.com', 'phone' => '0701020304',
            'password' => 'MotDePasse123', 'password_confirmation' => 'MotDePasse123', 'accept_terms' => true,
        ];
    }

    public function test_a_new_traveler_gets_a_referral_code_at_registration(): void
    {
        $this->postJson('/api/auth/register-traveler', $this->registration())->assertSuccessful();

        $code = User::where('email', 'awa@example.com')->value('referral_code');

        $this->assertNotNull($code);
        $this->assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{8}$/', $code, '8 caractères, sans I, O, 0 ni 1 (confusions possibles à la saisie)');
    }

    public function test_only_members_get_a_code_not_partners_admins_or_guests(): void
    {
        $this->assertNotNull(User::factory()->create(['role' => 'user'])->referral_code);

        $this->assertNull(User::factory()->create(['role' => 'host'])->referral_code);
        $this->assertNull(User::factory()->create(['role' => 'admin'])->referral_code);
        $this->assertNull(User::factory()->create(['role' => 'user', 'is_guest' => true])->referral_code, 'un invité n\'est pas un membre');
    }

    public function test_a_guest_who_finishes_registering_gets_a_code(): void
    {
        $guest = User::factory()->create(['role' => 'user', 'is_guest' => true, 'email' => 'invite@example.com']);
        $this->assertNull($guest->referral_code);

        $this->postJson('/api/auth/register-traveler', $this->registration(['email' => 'invite@example.com']))->assertSuccessful();

        $this->assertNotNull($guest->fresh()->referral_code);
    }

    public function test_a_code_never_changes_once_given_and_codes_are_unique(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $code = $user->referral_code;

        $user->update(['name' => 'Nouveau nom']);
        $this->assertSame($code, $user->fresh()->referral_code);

        $codes = collect(range(1, 30))->map(fn () => User::factory()->create(['role' => 'user'])->referral_code)->push($code);
        $this->assertSame($codes->count(), $codes->unique()->count());
    }

    public function test_an_existing_member_without_a_code_gets_one_the_next_time_the_account_is_saved(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        \DB::table('users')->where('id', $user->id)->update(['referral_code' => null]);   // compte ancien

        $user->fresh()->update(['last_login_at' => now()]);

        $this->assertNotNull($user->fresh()->referral_code);
    }

    public function test_the_loyalty_page_returns_the_code_the_sharing_link_and_the_bonus_amounts(): void
    {
        config(['services.frontend_url' => 'https://bosejour.ci']);
        Setting::set('loyalty_referral_bonus_parrain', 80, 'number');
        Setting::set('loyalty_referral_bonus_filleul', 30, 'number');
        $member = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($member);

        $data = $this->getJson('/api/me/loyalty')->assertOk()->json('data');

        $this->assertSame($member->referral_code, $data['referral_code']);
        $this->assertSame('https://bosejour.ci/auth/register?ref=' . $member->referral_code, $data['referral_link']);
        $this->assertSame(80, $data['referral_bonus_parrain'], 'le texte affiché suit le réglage admin');
        $this->assertSame(30, $data['referral_bonus_filleul']);
    }

    public function test_the_loyalty_page_creates_a_missing_code_and_its_link(): void
    {
        $member = User::factory()->create(['role' => 'user']);
        \DB::table('users')->where('id', $member->id)->update(['referral_code' => null]);
        Sanctum::actingAs($member->fresh());

        $data = $this->getJson('/api/me/loyalty')->assertOk()->json('data');

        $this->assertNotEmpty($data['referral_code']);
        $this->assertStringEndsWith('?ref=' . $data['referral_code'], $data['referral_link']);
    }

    public function test_signing_up_through_a_sharing_link_links_the_new_member_to_the_sponsor(): void
    {
        $sponsor = User::factory()->create(['role' => 'user']);

        // Le lien est /auth/register?ref=CODE : le formulaire envoie ce code tel quel.
        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => $sponsor->referral_code]))->assertSuccessful();

        $this->assertSame($sponsor->id, User::where('email', 'awa@example.com')->value('referred_by_user_id'));
    }

    public function test_an_unknown_code_is_ignored_and_does_not_block_the_registration(): void
    {
        $this->postJson('/api/auth/register-traveler', $this->registration(['referral_code' => 'ZZZZZZZZ']))->assertSuccessful();

        $this->assertNull(User::where('email', 'awa@example.com')->value('referred_by_user_id'));
        $this->assertNotNull(User::where('email', 'awa@example.com')->value('id'), 'le compte est bien créé');
    }

    public function test_the_sharing_link_encodes_the_code(): void
    {
        $this->assertSame(config('services.frontend_url') . '/auth/register?ref=K7XQ2MPA', ReferralCode::link('K7XQ2MPA'));
    }
}
