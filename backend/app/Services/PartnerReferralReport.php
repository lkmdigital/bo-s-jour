<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\LoyaltyPointsTransaction;
use App\Models\ReferralPartner;
use App\Models\ReferralPartnerClick;
use App\Models\ReferralPartnerReferral as Referral;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Fiche complète d'un ambassadeur (Super Admin) : identité, performance (visites, scans, inscriptions, réservations, chiffre d'affaires),
 * évolution jour par jour, détail de chaque filleul, réservations générées, mouvements de points et journal d'activité.
 */
class PartnerReferralReport
{
    public const PERIODS = [7, 30, 90];

    public function __construct(private PartnerReferralService $service) {}

    public function build(ReferralPartner $partner, int $days = 30): array
    {
        $days = in_array($days, self::PERIODS, true) ? $days : 30;
        $partner->load(['user:id,name,email,phone,whatsapp,loyalty_points_balance,loyalty_tier', 'createdBy:id,name']);

        $referrals = Referral::with('user:id,name,email,phone')->where('referral_partner_id', $partner->id)->orderByDesc('id')->get();
        $bookings = $referrals->isEmpty()
            ? collect()
            : Booking::with('accommodation:id,name,city')->whereIn('user_id', $referrals->pluck('user_id'))->orderByDesc('id')->limit(300)->get();
        $ledger = $partner->user_id
            ? LoyaltyPointsTransaction::where('user_id', $partner->user_id)->where('type', 'like', 'partner_%')->orderByDesc('id')->limit(100)->get()
            : collect();

        return [
            'visits' => $this->visits($partner),
            'funnel' => $this->funnel($partner, $referrals),
            'timeline' => ['days' => $days, 'series' => $this->timeline($partner, $referrals, $days)],
            'revenue' => $this->revenue($referrals, $bookings),
            'points' => $this->points($partner, $referrals, $ledger),
            'referrals' => $referrals->map(fn (Referral $r) => $this->presentReferral($r, $bookings))->values(),
            'bookings' => $bookings->map(fn (Booking $b) => $this->presentBooking($b, $referrals))->values(),
            'ledger' => $ledger->map(fn (LoyaltyPointsTransaction $t) => [
                'id' => $t->id,
                'at' => $t->created_at?->toIso8601String(),
                'points' => $t->points,
                'type' => $t->type,
                'label' => LoyaltyPointsTransaction::LABELS[$t->type] ?? $t->type,
                'description' => $t->description,
            ])->values(),
            'events' => $this->events($partner, $referrals, $ledger),
        ];
    }

    /** Visites du lien court et du QR code : passages (un visiteur compté une fois par jour), visiteurs uniques, sources. */
    private function visits(ReferralPartner $partner): array
    {
        $q = fn () => ReferralPartnerClick::where('referral_partner_id', $partner->id);

        $bySource = $q()->select('source', DB::raw('count(*) as n'))->groupBy('source')->pluck('n', 'source');
        $perVisitor = $q()->select('visitor_hash', DB::raw('count(*) as n'))->groupBy('visitor_hash')->pluck('n');

        return [
            'total' => (int) $q()->count(),
            'unique_visitors' => $perVisitor->count(),
            'returning_visitors' => $perVisitor->filter(fn ($n) => $n > 1)->count(),
            'today' => (int) $q()->where('created_at', '>=', now()->startOfDay())->count(),
            'last_7_days' => (int) $q()->where('created_at', '>=', now()->subDays(6)->startOfDay())->count(),
            'last_30_days' => (int) $q()->where('created_at', '>=', now()->subDays(29)->startOfDay())->count(),
            'by_source' => [
                'qr' => (int) ($bySource['qr'] ?? 0),
                'link' => (int) ($bySource['link'] ?? 0),
                'unknown' => (int) ($bySource[''] ?? 0),
            ],
            'first_at' => $q()->min('created_at'),
            'last_at' => $q()->max('created_at'),
        ];
    }

    private function funnel(ReferralPartner $partner, Collection $referrals): array
    {
        $visitors = (int) ReferralPartnerClick::where('referral_partner_id', $partner->id)->distinct()->count('visitor_hash');
        $signups = $referrals->count();
        $validated = $referrals->whereNotNull('signup_validated_at')->count();
        $booked = $referrals->whereNotNull('first_booking_at')->count();
        $rate = fn (int $a, int $b) => $b > 0 ? round($a / $b * 100, 1) : null;

        return [
            'visitors' => $visitors,
            'signups' => $signups,
            'signups_validated' => $validated,
            'bookings' => $booked,
            'rate_signup' => $rate($signups, $visitors),
            'rate_validation' => $rate($validated, $signups),
            'rate_booking' => $rate($booked, $signups),
            'rate_global' => $rate($booked, $visitors),
        ];
    }

    /** Jour par jour sur la période : visites, inscriptions, validations, premières réservations (jours sans activité compris). */
    private function timeline(ReferralPartner $partner, Collection $referrals, int $days): array
    {
        $from = now()->subDays($days - 1)->startOfDay();
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $day = $from->copy()->addDays($i)->toDateString();
            $series[$day] = ['date' => $day, 'visits' => 0, 'signups' => 0, 'validated' => 0, 'bookings' => 0];
        }

        ReferralPartnerClick::where('referral_partner_id', $partner->id)->where('created_at', '>=', $from)
            ->select(DB::raw('DATE(created_at) as d'), DB::raw('count(*) as n'))->groupBy('d')->get()
            ->each(function ($row) use (&$series) {
                if (isset($series[$row->d])) {
                    $series[$row->d]['visits'] = (int) $row->n;
                }
            });

        $bump = function (?Carbon $at, string $key) use (&$series, $from) {
            if ($at && $at >= $from && isset($series[$at->toDateString()])) {
                $series[$at->toDateString()][$key]++;
            }
        };
        foreach ($referrals as $r) {
            $bump($r->created_at, 'signups');
            $bump($r->signup_validated_at, 'validated');
            $bump($r->first_booking_at, 'bookings');
        }

        return array_values($series);
    }

    /** Ce que le réseau de l'ambassadeur a rapporté à boséjour (réservations confirmées ou terminées) et ce que les remises ont coûté. */
    private function revenue(Collection $referrals, Collection $bookings): array
    {
        $paid = $bookings->filter(fn (Booking $b) => in_array($b->status->value, ['confirmed', 'completed'], true));
        $referralIds = $referrals->pluck('id');
        $discounts = $paid->filter(fn (Booking $b) => $b->partner_referral_id && $referralIds->contains($b->partner_referral_id));

        return [
            'bookings_total' => $bookings->count(),
            'bookings_paid' => $paid->count(),
            'bookings_cancelled' => $bookings->filter(fn (Booking $b) => $b->status->value === 'cancelled')->count(),
            'gross_amount' => (float) $paid->sum('total_price'),
            'average_basket' => $paid->count() ? round((float) $paid->avg('total_price')) : null,
            'discounts_granted' => (float) $discounts->sum('referral_discount_amount'),
            'discounts_count' => $discounts->count(),
        ];
    }

    private function points(ReferralPartner $partner, Collection $referrals, Collection $ledger): array
    {
        $owed = (int) $referrals->filter(fn (Referral $r) => $r->signup_points > 0 && !$r->signup_credited_at)->sum('signup_points')
            + (int) $referrals->filter(fn (Referral $r) => $r->booking_points > 0 && !$r->booking_credited_at)->sum('booking_points');

        return [
            'earned' => (int) $ledger->where('points', '>', 0)->sum('points'),
            'withdrawn' => (int) abs($ledger->where('points', '<', 0)->sum('points')),
            'pending_account' => $partner->user_id ? 0 : $owed,   // gagnés, en attente que l'ambassadeur crée son compte
            'balance' => $partner->user ? (int) $partner->user->loyalty_points_balance : null,
            'tier' => $partner->user?->loyalty_tier,
        ];
    }

    private function presentReferral(Referral $r, Collection $bookings): array
    {
        $first = $r->first_booking_id ? $bookings->firstWhere('id', $r->first_booking_id) : null;
        $held = $r->discount_booking_id ? $bookings->firstWhere('id', $r->discount_booking_id) : null;

        return [
            'id' => $r->id,
            'user' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email, 'phone' => $r->user->phone] : null,
            'registered_at' => $r->created_at?->toIso8601String(),
            'validated_at' => $r->signup_validated_at?->toIso8601String(),
            'signup_points' => $r->signup_points,
            'signup_credited' => (bool) $r->signup_credited_at,
            'first_booking' => $first ? $this->presentBooking($first, collect([$r])) : null,
            'booking_points' => $r->booking_points,
            'booking_credited' => (bool) $r->booking_credited_at,
            'discount_state' => $r->discount_state,
            'discount_amount' => $held ? (float) $held->referral_discount_amount : null,
            'bookings_count' => $bookings->where('user_id', $r->user_id)->count(),
        ];
    }

    private function presentBooking(Booking $b, Collection $referrals): array
    {
        $isDiscounted = $b->partner_referral_id && $referrals->pluck('id')->contains($b->partner_referral_id);

        return [
            'id' => $b->id,
            'number' => $b->booking_number,
            'accommodation' => $b->accommodation?->name,
            'city' => $b->accommodation?->city,
            'check_in' => $b->check_in instanceof Carbon ? $b->check_in->toDateString() : (string) $b->check_in,
            'check_out' => $b->check_out instanceof Carbon ? $b->check_out->toDateString() : (string) $b->check_out,
            'status' => $b->status->value,
            'status_label' => $b->status->label(),
            'total_price' => (float) $b->total_price,
            'discount_amount' => $isDiscounted ? (float) $b->referral_discount_amount : 0.0,
            'user_id' => $b->user_id,
            'created_at' => $b->created_at?->toIso8601String(),
        ];
    }

    /** Journal chronologique (le plus récent d'abord) : désignation, rattachement du compte, inscriptions, réservations, points. */
    private function events(ReferralPartner $partner, Collection $referrals, Collection $ledger): array
    {
        $events = [];
        $add = function (?Carbon $at, string $type, string $label) use (&$events) {
            if ($at) {
                $events[] = ['at' => $at->toIso8601String(), 'type' => $type, 'label' => $label, '_ts' => $at->getTimestamp()];
            }
        };

        $add($partner->created_at, 'designated', 'Désigné ambassadeur' . ($partner->createdBy ? " par {$partner->createdBy->name}" : ''));
        if ($partner->claimed_at && ($partner->invited_email || $partner->invited_phone)) {
            $add($partner->claimed_at, 'claimed', 'A créé son compte : il a retrouvé son QR code et ses points');
        }
        foreach ($referrals as $r) {
            $name = $r->user?->name ?? 'Un client';
            $add($r->created_at, 'signup', "{$name} s'est inscrit via son invitation");
            $add($r->signup_validated_at, 'validated', "{$name} a validé son inscription");
            $add($r->first_booking_at, 'booking', "{$name} a confirmé sa première réservation");
        }
        foreach ($ledger as $t) {
            $sign = $t->points > 0 ? '+' : '';
            $add($t->created_at, 'points', "{$sign}{$t->points} points — " . (LoyaltyPointsTransaction::LABELS[$t->type] ?? $t->type));
        }

        usort($events, fn ($a, $b) => $b['_ts'] <=> $a['_ts']);

        return array_map(fn ($e) => array_diff_key($e, ['_ts' => 1]), array_slice($events, 0, 80));
    }
}
