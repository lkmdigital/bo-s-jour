<?php

namespace App\Services;

use App\Models\LoyaltyPointsTransaction;
use App\Models\ReferralPartner;
use App\Models\ReferralPartnerClick;
use App\Models\ReferralPartnerReferral;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Parrainage ambassadeur (cahier des charges du 2026-11-09) : suivi des clics, rattachement du filleul à
 * l'inscription, points de l'ambassadeur à l'inscription validée (palier 1) — puis à la 1re réservation (palier 2).
 * Les points sont de la fidélité ordinaire (bons de réduction sur des séjours) : jamais convertis en argent.
 */
class PartnerReferralService
{
    public const DEFAULT_SIGNUP_POINTS = 50;

    public static function normalize(?string $code): string
    {
        return strtoupper(trim((string) $code));
    }

    public function resolve(?string $code): ?ReferralPartner
    {
        $code = self::normalize($code);
        if ($code === '') {
            return null;
        }

        return ReferralPartner::where('code', $code)->where('is_active', true)->first();
    }

    /** Lien court traçable : c'est lui que le QR code encode, pour que chaque scan soit compté. */
    public function shortLink(ReferralPartner $partner): string
    {
        return rtrim((string) config('services.frontend_url', 'https://bosejour.ci'), '/') . '/p/' . urlencode($partner->code);
    }

    /** Lien direct vers l'inscription, code prérempli (utilisé après le comptage du clic). */
    public function registerPath(ReferralPartner $partner): string
    {
        return '/auth/register?ref=' . urlencode($partner->code);
    }

    /**
     * Compte un visiteur unique par jour (empreinte salée IP + navigateur, aucune donnée brute conservée).
     * Retourne true si le clic a été enregistré, false s'il s'agissait du même visiteur le même jour.
     */
    public function recordClick(ReferralPartner $partner, ?string $ip, ?string $userAgent): bool
    {
        $hash = hash_hmac('sha256', ($ip ?? '') . '|' . ($userAgent ?? ''), (string) config('app.key'));

        $alreadyToday = ReferralPartnerClick::where('referral_partner_id', $partner->id)
            ->where('visitor_hash', $hash)
            ->where('created_at', '>=', now()->startOfDay())
            ->exists();
        if ($alreadyToday) {
            return false;
        }

        ReferralPartnerClick::create(['referral_partner_id' => $partner->id, 'visitor_hash' => $hash]);

        return true;
    }

    /** Rattache un nouveau compte à l'ambassadeur ; jamais à lui-même, jamais deux fois. */
    public function attach(ReferralPartner $partner, User $filleul): ?ReferralPartnerReferral
    {
        if ($partner->user_id === $filleul->id) {
            return null;
        }

        return ReferralPartnerReferral::firstOrCreate(['referral_partner_id' => $partner->id, 'user_id' => $filleul->id]);
    }

    /** Palier 1 : l'e-mail du filleul est vérifié → +50 points à l'ambassadeur, une seule fois par rattachement. */
    public function onEmailVerified(User $filleul): void
    {
        $pending = ReferralPartnerReferral::with('partner.user')
            ->where('user_id', $filleul->id)
            ->whereNull('signup_validated_at')
            ->get();

        foreach ($pending as $referral) {
            DB::transaction(function () use ($referral, $filleul) {
                $locked = ReferralPartnerReferral::lockForUpdate()->find($referral->id);
                if (!$locked || $locked->signup_validated_at) {
                    return;
                }

                $partner = $referral->partner;
                $points = (int) Setting::get('loyalty_partner_signup_points', self::DEFAULT_SIGNUP_POINTS);
                if ($partner && $partner->is_active && $partner->user && $points > 0) {
                    app(LoyaltyService::class)->awardPoints(
                        $partner->user,
                        $points,
                        LoyaltyPointsTransaction::TYPE_PARTNER_SIGNUP,
                        null,
                        "Parrainage — {$filleul->name} a validé son inscription"
                    );
                } else {
                    $points = 0;
                }

                $locked->update(['signup_validated_at' => now(), 'signup_points' => $points]);
            });
        }
    }

    /** Chiffres du tableau de bord : clics uniques, inscriptions, réservations, conversions, points distribués. */
    public function stats(ReferralPartner $partner): array
    {
        $clicks = (int) ReferralPartnerClick::where('referral_partner_id', $partner->id)->distinct()->count('visitor_hash');
        $referrals = ReferralPartnerReferral::where('referral_partner_id', $partner->id);

        $signups = (clone $referrals)->count();
        $validated = (clone $referrals)->whereNotNull('signup_validated_at')->count();
        $bookings = (clone $referrals)->whereNotNull('first_booking_at')->count();
        $points = (int) (clone $referrals)->sum(DB::raw('signup_points + booking_points'));

        return [
            'clicks' => $clicks,
            'signups' => $signups,
            'signups_validated' => $validated,
            'bookings' => $bookings,
            'points_awarded' => $points,
            'conversion_signup' => $clicks > 0 ? round($signups / $clicks * 100, 1) : null,
            'conversion_booking' => $signups > 0 ? round($bookings / $signups * 100, 1) : null,
        ];
    }

    /** Un code d'ambassadeur ne doit entrer en collision avec aucun code membre, ni aucun autre ambassadeur. */
    public static function codeAvailable(string $code, ?int $exceptPartnerId = null): bool
    {
        return !User::where('referral_code', $code)->exists()
            && !ReferralPartner::where('code', $code)->when($exceptPartnerId, fn ($q) => $q->where('id', '!=', $exceptPartnerId))->exists();
    }
}
