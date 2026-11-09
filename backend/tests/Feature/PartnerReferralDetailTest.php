<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\ReferralPartner;
use App\Models\ReferralPartnerClick;
use App\Models\Room;
use App\Models\User;
use App\Services\PartnerReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Fiche complète d'un ambassadeur (Super Admin) : visites, scans, inscriptions, réservations, chiffre d'affaires, points, journal. */
class PartnerReferralDetailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Bus::fake();
        Mail::fake();
    }

    private function ambassador(): ReferralPartner
    {
        return ReferralPartner::create([
            'user_id' => User::factory()->create(['role' => 'user'])->id, 'code' => 'CHEZMAMA', 'display_name' => 'Chez Mama',
        ]);
    }

    private function filleul(ReferralPartner $partner): User
    {
        $user = User::factory()->create(['role' => 'user', 'email_verified_at' => null]);
        app(PartnerReferralService::class)->attach($partner, $user);
        $user->update(['email_verified_at' => now()]);

        return $user->fresh();
    }

    private function bookAndConfirm(User $user): Booking
    {
        $acc = Accommodation::factory()->create(['status' => 'published']);
        $room = Room::create(['accommodation_id' => $acc->id, 'name' => 'Ch', 'type' => 'double', 'capacity' => 2, 'price_per_night' => 30000, 'is_active' => true, 'quantity' => 1]);
        Sanctum::actingAs($user);
        $id = $this->postJson('/api/bookings', [
            'accommodation_id' => $acc->id, 'room_id' => $room->id, 'check_in' => now()->addDays(10)->toDateString(),
            'check_out' => now()->addDays(12)->toDateString(), 'guests' => 2, 'residence_country' => "Côte d'Ivoire",
        ])->assertCreated()->json('id');
        $booking = Booking::findOrFail($id);
        $booking->update(['status' => BookingStatus::Confirmed->value]);

        return $booking->fresh();
    }

    private function asAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_only_admins_can_open_the_detail(): void
    {
        $partner = $this->ambassador();
        foreach (['user', 'host'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->getJson("/api/admin/referral-partners/{$partner->id}")->assertStatus(403);
        }
        $this->asAdmin();
        $this->getJson('/api/admin/referral-partners/9999')->assertStatus(404);
    }

    public function test_visits_are_split_between_qr_scans_and_link_clicks(): void
    {
        $partner = $this->ambassador();
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA', 'source' => 'qr'])->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])->postJson('/api/referral/click', ['code' => 'CHEZMAMA', 'source' => 'link']);
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.6'])->postJson('/api/referral/click', ['code' => 'CHEZMAMA']);   // anciens QR : source inconnue
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA', 'source' => 'nimporte'])->assertStatus(422);

        $this->asAdmin();
        $visits = $this->getJson("/api/admin/referral-partners/{$partner->id}")->assertOk()->json('data.report.visits');

        $this->assertSame(3, $visits['total']);
        $this->assertSame(3, $visits['unique_visitors']);
        $this->assertSame(['qr' => 1, 'link' => 1, 'unknown' => 1], $visits['by_source']);
        $this->assertSame(3, $visits['today']);
        $this->assertNotNull($visits['last_at']);
    }

    public function test_a_returning_visitor_is_counted_as_returning(): void
    {
        $partner = $this->ambassador();
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA']);
        ReferralPartnerClick::query()->update(['created_at' => now()->subDays(3)]);
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA']);   // même visiteur, un autre jour

        $this->asAdmin();
        $visits = $this->getJson("/api/admin/referral-partners/{$partner->id}")->json('data.report.visits');

        $this->assertSame(2, $visits['total']);
        $this->assertSame(1, $visits['unique_visitors']);
        $this->assertSame(1, $visits['returning_visitors']);
    }

    public function test_the_funnel_revenue_and_each_referral_are_detailed(): void
    {
        $partner = $this->ambassador();
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA', 'source' => 'qr']);
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])->postJson('/api/referral/click', ['code' => 'CHEZMAMA', 'source' => 'qr']);

        $buyer = $this->filleul($partner);
        $this->filleul($partner);                       // inscrit validé, n'a pas encore réservé
        $booking = $this->bookAndConfirm($buyer);

        $this->asAdmin();
        $data = $this->getJson("/api/admin/referral-partners/{$partner->id}")->assertOk()->json('data');
        $report = $data['report'];

        $this->assertEquals(
            ['visitors' => 2, 'signups' => 2, 'signups_validated' => 2, 'bookings' => 1, 'rate_signup' => 100, 'rate_validation' => 100, 'rate_booking' => 50, 'rate_global' => 50],
            $report['funnel']
        );
        $this->assertSame(1, $report['revenue']['bookings_paid']);
        $this->assertEquals(58500, $report['revenue']['gross_amount'], '2 nuits à 30 000 moins 1 500 de remise');
        $this->assertEquals(1500, $report['revenue']['discounts_granted']);
        $this->assertCount(2, $report['referrals']);

        $row = collect($report['referrals'])->firstWhere('user.id', $buyer->id);
        $this->assertSame($booking->id, $row['first_booking']['id']);
        $this->assertSame(50, $row['booking_points']);
        $this->assertTrue($row['booking_credited']);
        $this->assertSame('used', $row['discount_state']);
        $this->assertEquals(1500, $row['discount_amount']);
        $this->assertSame(1, $row['bookings_count']);
        $this->assertSame($buyer->email, $row['user']['email']);

        $this->assertCount(1, $report['bookings']);
        $this->assertSame('confirmed', $report['bookings'][0]['status']);
    }

    public function test_points_ledger_and_balance_follow_withdrawals(): void
    {
        $partner = $this->ambassador();
        $buyer = $this->filleul($partner);
        $booking = $this->bookAndConfirm($buyer);   // 50 + 50
        Sanctum::actingAs($buyer);
        $this->postJson("/api/bookings/{$booking->id}/cancel")->assertOk();   // −50

        $this->asAdmin();
        $report = $this->getJson("/api/admin/referral-partners/{$partner->id}")->json('data.report');

        $this->assertSame(100, $report['points']['earned']);
        $this->assertSame(50, $report['points']['withdrawn']);
        $this->assertSame(50, $report['points']['balance']);
        $this->assertCount(3, $report['ledger']);
        $this->assertSame('Parrainage ambassadeur (points retirés)', collect($report['ledger'])->firstWhere('points', -50)['label']);
    }

    public function test_a_designated_person_without_account_shows_the_points_waiting_for_them(): void
    {
        $partner = ReferralPartner::create(['code' => 'CHEZMAMA', 'invited_email' => 'mama@example.com', 'display_name' => 'Chez Mama']);
        $this->filleul($partner);

        $this->asAdmin();
        $data = $this->getJson("/api/admin/referral-partners/{$partner->id}")->assertOk()->json('data');

        $this->assertSame('pending_account', $data['status']);
        $this->assertSame(50, $data['report']['points']['pending_account']);
        $this->assertNull($data['report']['points']['balance']);
        $this->assertSame([], $data['report']['ledger']);
    }

    public function test_the_timeline_covers_every_day_of_the_period_and_the_journal_is_newest_first(): void
    {
        $partner = $this->ambassador();
        $this->postJson('/api/referral/click', ['code' => 'CHEZMAMA']);
        $this->filleul($partner);

        $this->asAdmin();
        foreach ([7, 30, 90] as $days) {
            $series = $this->getJson("/api/admin/referral-partners/{$partner->id}?days={$days}")->json('data.report.timeline.series');
            $this->assertCount($days, $series);
        }
        $this->assertCount(30, $this->getJson("/api/admin/referral-partners/{$partner->id}?days=12")->json('data.report.timeline.series'), 'période inconnue : 30 jours');

        $report = $this->getJson("/api/admin/referral-partners/{$partner->id}")->json('data.report');
        $today = collect($report['timeline']['series'])->last();
        $this->assertSame(['visits' => 1, 'signups' => 1, 'validated' => 1, 'bookings' => 0], collect($today)->only(['visits', 'signups', 'validated', 'bookings'])->all());

        $types = collect($report['events'])->pluck('type');
        $this->assertTrue($types->contains('designated') && $types->contains('signup') && $types->contains('validated') && $types->contains('points'));
        $times = collect($report['events'])->pluck('at')->all();
        $sorted = $times;
        rsort($sorted);
        $this->assertSame($sorted, $times);
    }

    public function test_notes_and_suspension_are_saved_and_the_qr_link_carries_the_source(): void
    {
        $partner = $this->ambassador();
        $this->asAdmin();

        $this->putJson("/api/admin/referral-partners/{$partner->id}", ['notes' => 'Rencontré au salon. Relancer en janvier.', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);

        $data = $this->getJson("/api/admin/referral-partners/{$partner->id}")->json('data');
        $this->assertSame('Rencontré au salon. Relancer en janvier.', $data['notes']);
        $this->assertSame(config('services.frontend_url') . '/p/CHEZMAMA?s=qr', $data['qr_link']);
        $this->assertSame(config('services.frontend_url') . '/p/CHEZMAMA', $data['link']);
        $this->assertSame('Chez Mama', $data['poster_name'], 'nom imprimé sur l\'affiche');
        $this->assertEquals(5, $data['discount_percent']);
    }

    public function test_the_contact_details_of_a_pending_ambassador_can_be_corrected_but_not_a_linked_one(): void
    {
        $pending = ReferralPartner::create(['code' => 'ATTENTE1', 'invited_email' => 'fautee@example.com']);
        $linked = $this->ambassador();
        $this->asAdmin();

        $this->putJson("/api/admin/referral-partners/{$pending->id}", ['invited_email' => 'Bonne@Example.com', 'invited_phone' => '+225 07 01 02 03 04'])->assertOk();
        $fresh = $pending->fresh();
        $this->assertSame('bonne@example.com', $fresh->invited_email);
        $this->assertSame('701020304', $fresh->invited_phone_key);

        $this->putJson("/api/admin/referral-partners/{$pending->id}", ['invited_email' => null, 'invited_phone' => null])->assertStatus(422);   // plus aucun moyen de le reconnaître
        $this->putJson("/api/admin/referral-partners/{$linked->id}", ['invited_email' => 'x@example.com'])->assertStatus(422);
    }

    public function test_the_member_qr_code_link_carries_the_qr_source(): void
    {
        $partner = $this->ambassador();
        Sanctum::actingAs($partner->user);

        $block = $this->getJson('/api/me/loyalty')->json('data.ambassador');

        $this->assertSame(config('services.frontend_url') . '/p/CHEZMAMA?s=qr', $block['qr_link']);
        $this->assertSame('Chez Mama', $block['poster_name']);

        $partner->update(['display_name' => null]);
        $this->assertSame($partner->user->name, $this->getJson('/api/me/loyalty')->json('data.ambassador.poster_name'), 'sans nom affiché : le nom du compte');
    }
}
