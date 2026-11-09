<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\ReferralPartner;
use App\Models\ReferralPartnerReferral;
use App\Models\Room;
use App\Models\Setting;
use App\Models\User;
use App\Services\BookingService;
use App\Services\PartnerReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Parrainage ambassadeur, étape 2 (cahier des charges du 2026-11-09) : remise de 5 % sur la première nuitée du filleul,
 * financée par boséjour ; +50 points à l'ambassadeur à la 1re réservation confirmée ; retirés si le filleul annule,
 * conservés si c'est l'hôte ; plusieurs codes possibles, jamais deux fois le même parrain.
 */
class PartnerReferralBookingTest extends TestCase
{
    use RefreshDatabase;

    private const NIGHT = 30000;

    protected function setUp(): void
    {
        parent::setUp();
        Bus::fake();
        Mail::fake();
    }

    private function room(): Room
    {
        $accommodation = Accommodation::factory()->create(['status' => 'published']);

        return Room::create([
            'accommodation_id' => $accommodation->id, 'name' => 'Chambre standard', 'type' => 'double',
            'capacity' => 4, 'price_per_night' => self::NIGHT, 'is_active' => true, 'quantity' => 3,
        ]);
    }

    private function payload(Room $room, array $extra = [], int $startInDays = 10): array
    {
        return array_merge([
            'accommodation_id' => $room->accommodation_id, 'room_id' => $room->id,
            'check_in' => now()->addDays($startInDays)->toDateString(), 'check_out' => now()->addDays($startInDays + 2)->toDateString(),
            'guests' => 2, 'residence_country' => "Côte d'Ivoire",
        ], $extra);
    }

    private function ambassador(string $code = 'CHEZMAMA', ?User $user = null): ReferralPartner
    {
        return ReferralPartner::create([
            'user_id' => ($user ?? User::factory()->create(['role' => 'user']))->id, 'code' => $code, 'display_name' => "Partenaire {$code}",
        ]);
    }

    /** Un membre inscrit via l'ambassadeur, e-mail validé (palier 1 : +50 points à l'ambassadeur). */
    private function filleul(ReferralPartner $partner): User
    {
        $user = User::factory()->create(['role' => 'user', 'email_verified_at' => null]);
        app(PartnerReferralService::class)->attach($partner, $user);
        $user->update(['email_verified_at' => now()]);

        return $user->fresh();
    }

    private function balance(ReferralPartner $partner): int
    {
        return (int) $partner->user->fresh()->loyalty_points_balance;
    }

    private function book(User $user, Room $room, array $extra = [], int $startInDays = 10): \Illuminate\Testing\TestResponse
    {
        Sanctum::actingAs($user);

        return $this->postJson('/api/bookings', $this->payload($room, $extra, $startInDays));
    }

    private function confirm(int $bookingId): Booking
    {
        $booking = Booking::findOrFail($bookingId);
        $booking->update(['status' => BookingStatus::Confirmed->value]);

        return $booking->fresh();
    }

    // --- Remise de 5 % -----------------------------------------------------------------------------------------

    public function test_the_first_night_gets_5_percent_off_funded_by_the_platform(): void
    {
        $filleul = $this->filleul($this->ambassador());

        $id = $this->book($filleul, $room = $this->room())->assertCreated()->json('id');

        $booking = Booking::findOrFail($id);
        $this->assertEquals(2 * self::NIGHT, $booking->base_price, "le tarif plein de l'hôte (commission, net hôte) ne bouge pas");
        $this->assertEquals(1500, $booking->referral_discount_amount, '5 % de UNE nuit de 30 000 FCFA');
        $this->assertEquals(2 * self::NIGHT - 1500, $booking->total_price, 'pas 5 % du séjour entier');
        $this->assertNotNull($booking->partner_referral_id);
    }

    public function test_extra_breakfast_is_not_discounted(): void
    {
        $filleul = $this->filleul($this->ambassador());
        $room = $this->room();
        $room->accommodation->update(['breakfast_price' => 4000]);

        $booking = Booking::findOrFail($this->book($filleul, $room, ['extra_breakfast_quantity' => 2])->assertCreated()->json('id'));

        $this->assertEquals(1500, $booking->referral_discount_amount);
        $this->assertEquals(2 * self::NIGHT + 8000 - 1500, $booking->total_price);
    }

    public function test_the_preview_shows_the_discount_before_payment_and_lowers_the_amount_due(): void
    {
        $filleul = $this->filleul($this->ambassador());
        $room = $this->room();
        Sanctum::actingAs($filleul);
        $query = http_build_query(['check_in' => now()->addDays(10)->toDateString(), 'check_out' => now()->addDays(12)->toDateString(), 'room_id' => $room->id]);

        $with = $this->getJson("/api/accommodations/{$room->accommodation_id}/price-preview?{$query}")->assertOk();
        $this->assertEquals(1500, $with->json('referral_discount.amount'));
        $this->assertSame('Invitation de Partenaire CHEZMAMA', $with->json('referral_discount.label'));

        $this->app['auth']->forgetGuards();
        $anonymous = $this->getJson("/api/accommodations/{$room->accommodation_id}/price-preview?{$query}")->assertOk();
        $this->assertNull($anonymous->json('referral_discount'), 'sans compte, pas de remise');
        $this->assertLessThan(
            $anonymous->json('payment_options.options.full.amount'),
            $with->json('payment_options.options.full.amount'),
            'le montant à payer annoncé tient compte de la remise'
        );
    }

    public function test_a_member_without_invitation_pays_the_full_price(): void
    {
        $id = $this->book(User::factory()->create(['role' => 'user']), $this->room())->assertCreated()->json('id');

        $booking = Booking::findOrFail($id);
        $this->assertEquals(0, $booking->referral_discount_amount);
        $this->assertEquals(2 * self::NIGHT, $booking->total_price);
    }

    public function test_the_percentage_follows_the_admin_setting(): void
    {
        Setting::set('loyalty_partner_filleul_discount_percent', 10, 'number');
        $filleul = $this->filleul($this->ambassador());

        $booking = Booking::findOrFail($this->book($filleul, $this->room())->assertCreated()->json('id'));

        $this->assertEquals(3000, $booking->referral_discount_amount);
    }

    public function test_the_discount_is_not_available_on_the_second_booking(): void   // TC-05
    {
        $filleul = $this->filleul($this->ambassador());
        $room = $this->room();

        $first = $this->book($filleul, $room)->assertCreated()->json('id');
        $this->confirm($first);
        $second = Booking::findOrFail($this->book($filleul, $room, [], 20)->assertCreated()->json('id'));

        $this->assertEquals(0, $second->referral_discount_amount);
        $this->assertEquals(2 * self::NIGHT, $second->total_price);
    }

    public function test_a_voucher_or_promo_code_chosen_by_the_traveler_wins_over_the_invitation(): void
    {
        $filleul = $this->filleul($this->ambassador());

        $this->book($filleul, $this->room(), ['referral_code' => 'CHEZMAMA', 'promo_code' => 'NOEL'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'cumuler'));

        $booking = Booking::findOrFail($this->book($filleul, $this->room(), ['promo_code' => 'INCONNU'])->assertCreated()->json('id'));
        $this->assertEquals(0, $booking->referral_discount_amount, 'un code promo saisi : choix du voyageur, pas de cumul');
        $this->assertSame(ReferralPartnerReferral::DISCOUNT_AVAILABLE, ReferralPartnerReferral::first()->discount_state, "l'invitation reste utilisable");
    }

    // --- Points de première réservation ------------------------------------------------------------------------

    public function test_the_ambassador_gets_50_more_points_when_the_first_booking_is_confirmed(): void   // TC-04
    {
        $partner = $this->ambassador();
        $filleul = $this->filleul($partner);
        $this->assertSame(50, $this->balance($partner), 'palier 1 : inscription');

        $id = $this->book($filleul, $this->room())->assertCreated()->json('id');
        $this->assertSame(50, $this->balance($partner), 'pas avant la confirmation');

        $this->confirm($id);
        $this->assertSame(100, $this->balance($partner));
        $this->assertSame(ReferralPartnerReferral::DISCOUNT_USED, ReferralPartnerReferral::first()->discount_state);

        $second = $this->book($filleul, $this->room(), [], 30)->assertCreated()->json('id');
        $this->confirm($second);
        $this->assertSame(100, $this->balance($partner), 'jamais plus de 100 points par filleul');
    }

    public function test_an_unpaid_booking_that_expires_gives_the_discount_back_and_no_points(): void
    {
        $partner = $this->ambassador();
        $filleul = $this->filleul($partner);

        $id = $this->book($filleul, $this->room())->assertCreated()->json('id');
        $this->assertSame(ReferralPartnerReferral::DISCOUNT_RESERVED, ReferralPartnerReferral::first()->discount_state);

        Booking::findOrFail($id)->update(['status' => BookingStatus::Cancelled->value]);   // expiration automatique : ni voyageur ni hôte

        $this->assertSame(ReferralPartnerReferral::DISCOUNT_AVAILABLE, ReferralPartnerReferral::first()->discount_state);
        $this->assertSame(50, $this->balance($partner));
        $again = Booking::findOrFail($this->book($filleul, $this->room(), [], 20)->assertCreated()->json('id'));
        $this->assertEquals(1500, $again->referral_discount_amount);
    }

    public function test_when_the_traveler_cancels_after_paying_the_points_are_withdrawn_and_the_discount_is_lost(): void
    {
        $partner = $this->ambassador();
        $filleul = $this->filleul($partner);
        $id = $this->book($filleul, $this->room())->assertCreated()->json('id');
        $this->confirm($id);
        $this->assertSame(100, $this->balance($partner));

        Sanctum::actingAs($filleul);
        $this->postJson("/api/bookings/{$id}/cancel")->assertOk();

        $this->assertSame(50, $this->balance($partner), 'les 50 points de 1re réservation sont retirés, ceux de l\'inscription restent');
        $this->assertDatabaseHas('loyalty_points_transactions', ['user_id' => $partner->user_id, 'points' => -50, 'type' => 'partner_booking_rev']);
        $this->assertSame(ReferralPartnerReferral::DISCOUNT_FORFEITED, ReferralPartnerReferral::first()->discount_state);

        // Sa prochaine réservation confirmée comptera comme sa première : l'ambassadeur retrouve ses 50 points, sans remise.
        $next = $this->book($filleul, $this->room(), [], 30)->assertCreated();
        $this->assertEquals(0, Booking::find($next->json('id'))->referral_discount_amount);
        $this->confirm($next->json('id'));
        $this->assertSame(100, $this->balance($partner));
    }

    public function test_when_the_host_cancels_after_payment_the_ambassador_keeps_the_points_and_the_discount_returns(): void
    {
        $partner = $this->ambassador();
        $filleul = $this->filleul($partner);
        $room = $this->room();
        $id = $this->book($filleul, $room)->assertCreated()->json('id');
        $this->confirm($id);

        app(BookingService::class)->cancel(Booking::findOrFail($id), "L'établissement annule", $room->accommodation->user_id ?? User::factory()->create(['role' => 'host'])->id);

        $this->assertSame(100, $this->balance($partner), 'le parrain garde ses points');
        $this->assertSame(ReferralPartnerReferral::DISCOUNT_AVAILABLE, ReferralPartnerReferral::first()->discount_state, 'le filleul n\'a pas eu son séjour : il garde sa remise');

        // …et l'ambassadeur n'est pas payé une seconde fois pour la même personne.
        $again = $this->book($filleul, $room, [], 30)->assertCreated()->json('id');
        $this->confirm($again);
        $this->assertSame(100, $this->balance($partner));
    }

    // --- Plusieurs codes ---------------------------------------------------------------------------------------

    public function test_a_second_sponsor_code_gives_the_discount_again_but_never_the_same_sponsor_twice(): void
    {
        $a = $this->ambassador('PARRAINA');
        $b = $this->ambassador('PARRAINB');
        $filleul = $this->filleul($a);
        $room = $this->room();

        $first = $this->book($filleul, $room)->assertCreated()->json('id');
        $this->confirm($first);   // A a utilisé son invitation
        $this->assertSame(100, $this->balance($a));

        // Même parrain : refusé.
        $this->book($filleul, $room, ['referral_code' => 'parraina'], 20)->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'déjà bénéficié'));

        // Un autre parrain : la remise est de nouveau disponible, et B reçoit ses points à la confirmation.
        $second = $this->book($filleul, $room, ['referral_code' => 'parrainb'], 20)->assertCreated();
        $this->assertEquals(1500, Booking::find($second->json('id'))->referral_discount_amount);
        $this->assertSame(0, $this->balance($b), 'pas avant la confirmation');
        $this->confirm($second->json('id'));
        $this->assertSame(50, $this->balance($b));
        $this->assertSame(100, $this->balance($a), 'A ne gagne rien de plus');
    }

    public function test_an_unknown_code_or_ones_own_code_is_refused_with_a_clear_message(): void
    {
        $partner = $this->ambassador();

        $this->book(User::factory()->create(['role' => 'user']), $this->room(), ['referral_code' => 'NEXISTEPAS'])
            ->assertStatus(422)->assertJsonPath('message', "Ce code d'invitation n'est pas reconnu.");

        $this->book($partner->user, $this->room(), ['referral_code' => 'CHEZMAMA'])
            ->assertStatus(422)->assertJsonPath('message', 'Vous ne pouvez pas utiliser votre propre code.');
    }

    public function test_a_suspended_ambassador_gives_no_discount(): void
    {
        $partner = $this->ambassador();
        $filleul = $this->filleul($partner);
        $partner->update(['is_active' => false]);

        $booking = Booking::findOrFail($this->book($filleul, $this->room())->assertCreated()->json('id'));

        $this->assertEquals(0, $booking->referral_discount_amount);
    }

    // --- Ambassadeur pas encore inscrit ------------------------------------------------------------------------

    public function test_points_earned_before_the_ambassador_has_an_account_are_paid_when_they_claim_it(): void
    {
        $pending = ReferralPartner::create(['code' => 'CHEZMAMA', 'invited_email' => 'mama@example.com']);
        $filleul = $this->filleul($pending);
        $id = $this->book($filleul, $this->room())->assertCreated()->json('id');
        $this->confirm($id);

        $this->assertSame(0, \App\Models\LoyaltyPointsTransaction::where('type', 'like', 'partner_%')->count(), 'personne à créditer pour l\'instant');

        $mama = User::factory()->create(['role' => 'user', 'email' => 'mama@example.com', 'email_verified_at' => null]);
        $mama->update(['email_verified_at' => now()]);

        $this->assertSame($mama->id, $pending->fresh()->user_id);
        $this->assertSame(100, (int) $mama->fresh()->loyalty_points_balance, '50 (inscription) + 50 (1re réservation)');

        $mama->update(['name' => 'Mama']);   // aucune nouvelle écriture : jamais crédité deux fois
        $this->assertSame(100, (int) $mama->fresh()->loyalty_points_balance);
    }

    public function test_the_member_page_lists_the_welcome_discount_still_available(): void
    {
        $filleul = $this->filleul($this->ambassador());
        Sanctum::actingAs($filleul);

        $this->getJson('/api/me/loyalty')->assertOk()
            ->assertJsonPath('data.welcome_discounts.0.percent', 5)
            ->assertJsonPath('data.welcome_discounts.0.label', 'Partenaire CHEZMAMA');

        $this->confirm($this->book($filleul, $this->room())->assertCreated()->json('id'));
        $this->assertSame([], $this->getJson('/api/me/loyalty')->json('data.welcome_discounts'));
    }
}
