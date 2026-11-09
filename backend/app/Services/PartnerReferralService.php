<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\LoyaltyPointsTransaction;
use App\Models\ReferralPartner;
use App\Models\ReferralPartnerClick;
use App\Models\ReferralPartnerReferral as Referral;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Parrainage ambassadeur (cahier des charges du 2026-11-09). Parcours :
 *   1. scan / clic → comptage du visiteur unique ;
 *   2. inscription validée (e-mail vérifié) → +50 points à l'ambassadeur ;
 *   3. 1re réservation → 5 % de remise sur la première nuitée du filleul (financée par boséjour) et +50 points à l'ambassadeur
 *      quand la réservation est confirmée (payée) — retirés si le filleul l'annule, conservés si c'est l'hôte.
 * Un membre peut utiliser plusieurs codes, jamais deux fois le même parrain. Les points sont de la fidélité ordinaire
 * (bons de réduction sur des séjours) : jamais convertis en argent.
 */
class PartnerReferralService
{
    public const DEFAULT_SIGNUP_POINTS = 50;
    public const DEFAULT_BOOKING_POINTS = 50;
    public const DEFAULT_DISCOUNT_PERCENT = 5;

    public static function normalize(?string $code): string
    {
        return strtoupper(trim((string) $code));
    }

    public static function signupPoints(): int
    {
        return (int) Setting::get('loyalty_partner_signup_points', self::DEFAULT_SIGNUP_POINTS);
    }

    public static function bookingPoints(): int
    {
        return (int) Setting::get('loyalty_partner_booking_points', self::DEFAULT_BOOKING_POINTS);
    }

    public static function discountPercent(): float
    {
        return (float) Setting::get('loyalty_partner_filleul_discount_percent', self::DEFAULT_DISCOUNT_PERCENT);
    }

    /** 9 derniers chiffres : « +225 07 01 02 03 04 », « 0701020304 » et « 2250701020304 » désignent le même numéro. */
    public static function phoneKey(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        return strlen($digits) >= 8 ? substr($digits, -9) : null;
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

    // ─── Clics ───────────────────────────────────────────────────────────────────────────────────────────────

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

    // ─── Ambassadeur désigné avant son inscription ──────────────────────────────────────────────────────────

    /** Vrai si le compte est (ou sera, d'après l'e-mail / le numéro prévus) l'ambassadeur lui-même. */
    public function isSelf(ReferralPartner $partner, User $user): bool
    {
        if ($partner->user_id && $partner->user_id === $user->id) {
            return true;
        }
        if ($partner->invited_email && strcasecmp($partner->invited_email, (string) $user->email) === 0) {
            return true;
        }

        return $partner->invited_phone_key
            && in_array($partner->invited_phone_key, array_filter([self::phoneKey($user->phone), self::phoneKey($user->whatsapp)]), true);
    }

    /** Membre existant (voyageur inscrit) qui correspond à cet e-mail, sinon à ce numéro. */
    public function findMember(?string $email, ?string $phone): ?User
    {
        $members = fn () => User::where('role', 'user')->where('is_guest', false);

        if ($email) {
            $byEmail = $members()->where('email', $email)->first();
            if ($byEmail) {
                return $byEmail;
            }
        }

        $key = self::phoneKey($phone);
        if ($key) {
            // Les numéros sont saisis avec espaces, +, tirets ou parenthèses : on les retire avant de comparer les 9 derniers chiffres.
            $clean = fn (string $column) => "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE({$column}, ' ', ''), '+', ''), '-', ''), '(', ''), ')', '')";

            return $members()
                ->where(fn ($q) => $q->whereRaw($clean('phone') . ' LIKE ?', ["%{$key}"])->orWhereRaw($clean('whatsapp') . ' LIKE ?', ["%{$key}"]))
                ->get()
                ->first(fn (User $u) => self::phoneKey($u->phone) === $key || self::phoneKey($u->whatsapp) === $key);
        }

        return null;
    }

    /**
     * Un compte vient de vérifier son e-mail : s'il correspond à un ambassadeur désigné avant son inscription (même e-mail ou
     * même numéro WhatsApp), il en prend la place et retrouve d'un coup son code, son QR code et les points déjà gagnés.
     */
    public function claimPending(User $user): ?ReferralPartner
    {
        if ($user->role !== 'user' || $user->is_guest || ReferralPartner::where('user_id', $user->id)->exists()) {
            return null;
        }

        $keys = array_values(array_filter([self::phoneKey($user->phone), self::phoneKey($user->whatsapp)]));
        $partner = ReferralPartner::whereNull('user_id')
            ->where(function ($q) use ($user, $keys) {
                $q->where('invited_email', $user->email);
                if ($keys) {
                    $q->orWhereIn('invited_phone_key', $keys);
                }
            })
            ->orderBy('id')
            ->first();
        if (!$partner) {
            return null;
        }

        try {
            DB::transaction(function () use ($partner, $user) {
                $partner->update(['user_id' => $user->id, 'claimed_at' => now()]);
                // Il ne peut pas avoir été parrainé par lui-même : ce rattachement ne compte pas.
                Referral::where('referral_partner_id', $partner->id)->where('user_id', $user->id)->delete();
            });
        } catch (QueryException $e) {
            return null;   // un autre rattachement a pris la place entre-temps
        }

        $this->creditOwed($partner->fresh());

        return $partner->fresh();
    }

    /** Crédite à l'ambassadeur les points déjà gagnés par son réseau et mis en attente faute de compte. */
    public function creditOwed(ReferralPartner $partner): void
    {
        if (!$partner->user_id) {
            return;
        }
        $partner->loadMissing('user');

        Referral::where('referral_partner_id', $partner->id)->get()->each(function (Referral $referral) use ($partner) {
            DB::transaction(function () use ($referral, $partner) {
                $locked = Referral::lockForUpdate()->find($referral->id);
                if (!$locked) {
                    return;
                }
                $filleul = User::find($locked->user_id);

                if ($locked->signup_points > 0 && !$locked->signup_credited_at) {
                    app(LoyaltyService::class)->awardPoints(
                        $partner->user, $locked->signup_points, LoyaltyPointsTransaction::TYPE_PARTNER_SIGNUP, null,
                        'Parrainage — ' . ($filleul?->name ?? 'un client') . ' a validé son inscription'
                    );
                    $locked->signup_credited_at = now();
                }
                if ($locked->booking_points > 0 && !$locked->booking_credited_at) {
                    app(LoyaltyService::class)->awardPoints(
                        $partner->user, $locked->booking_points, LoyaltyPointsTransaction::TYPE_PARTNER_BOOKING,
                        $locked->first_booking_id ? Booking::find($locked->first_booking_id) : null,
                        'Parrainage — ' . ($filleul?->name ?? 'un client') . ' a confirmé sa première réservation'
                    );
                    $locked->booking_credited_at = now();
                }
                $locked->save();
            });
        });
    }

    // ─── Inscription : palier 1 ──────────────────────────────────────────────────────────────────────────────

    /** Rattache un nouveau compte à l'ambassadeur ; jamais à lui-même, jamais deux fois le même parrain. */
    public function attach(ReferralPartner $partner, User $filleul): ?Referral
    {
        if ($this->isSelf($partner, $filleul)) {
            return null;
        }

        return Referral::firstOrCreate(['referral_partner_id' => $partner->id, 'user_id' => $filleul->id]);
    }

    /**
     * L'e-mail d'un compte vient d'être vérifié : (1) il reprend la place d'un ambassadeur désigné à son nom, (2) l'inscription
     * qu'il avait faite via un ambassadeur devient « validée » → +50 points, une seule fois par rattachement.
     */
    public function onEmailVerified(User $user): void
    {
        $this->claimPending($user);

        $pending = Referral::with('partner.user')->where('user_id', $user->id)->whereNull('signup_validated_at')->get();
        foreach ($pending as $referral) {
            DB::transaction(function () use ($referral, $user) {
                $locked = Referral::lockForUpdate()->find($referral->id);
                if (!$locked || $locked->signup_validated_at) {
                    return;
                }

                $partner = $referral->partner;
                $points = $partner && $partner->is_active ? self::signupPoints() : 0;
                $locked->update(['signup_validated_at' => now(), 'signup_points' => $points]);

                if ($points > 0 && $partner->user_id) {
                    $this->creditOwed($partner);   // crédite aussi ce qui était déjà en attente, sans jamais doubler
                }
            });
        }
    }

    // ─── Réservation : remise de 5 % et palier 2 ─────────────────────────────────────────────────────────────

    /**
     * Remise de bienvenue : 5 % de la première nuitée (d'une nuit de l'ensemble des chambres réservées, hors options), jamais le
     * séjour entier. Le voyageur peut saisir le code d'un ambassadeur à la réservation (même sans l'avoir utilisé à l'inscription) ;
     * sinon, la remise disponible la plus ancienne s'applique. Un même parrain ne donne droit à la remise qu'une fois.
     *
     * @return array{amount: float, percent: float, partner: ?ReferralPartner, referral: ?Referral, error: ?string}
     */
    public function welcomeDiscount(?User $user, ?string $code, float $pricePerNight, int $roomsQuantity = 1): array
    {
        $none = ['amount' => 0.0, 'percent' => 0.0, 'partner' => null, 'referral' => null, 'error' => null];
        $percent = self::discountPercent();
        if (!$user || $user->role !== 'user' || $user->is_guest || $percent <= 0) {
            return $none;
        }

        $code = self::normalize($code);
        if ($code !== '') {
            $partner = $this->resolve($code);
            if (!$partner) {
                return ['error' => "Ce code d'invitation n'est pas reconnu."] + $none;
            }
            if ($this->isSelf($partner, $user)) {
                return ['error' => 'Vous ne pouvez pas utiliser votre propre code.'] + $none;
            }
            $referral = Referral::where('referral_partner_id', $partner->id)->where('user_id', $user->id)->first();
            if ($referral && $referral->discount_state !== Referral::DISCOUNT_AVAILABLE) {
                return ['error' => "Vous avez déjà bénéficié de l'invitation de " . ($partner->display_name ?: 'ce partenaire') . '.'] + $none;
            }
        } else {
            $referral = Referral::with('partner')
                ->where('user_id', $user->id)
                ->where('discount_state', Referral::DISCOUNT_AVAILABLE)
                ->whereHas('partner', fn ($q) => $q->where('is_active', true))
                ->orderBy('id')
                ->first();
            $partner = $referral?->partner;
            if (!$partner) {
                return $none;
            }
        }

        return [
            'amount' => (float) round($pricePerNight * max(1, $roomsQuantity) * $percent / 100),
            'percent' => $percent,
            'partner' => $partner,
            'referral' => $referral,
            'error' => null,
        ];
    }

    /** À appeler dans la transaction qui crée la réservation : pose la remise sur la réservation (état « réservée »). */
    public function reserveDiscount(Booking $booking, ReferralPartner $partner, float $amount): void
    {
        $referral = Referral::lockForUpdate()->firstOrCreate(['referral_partner_id' => $partner->id, 'user_id' => $booking->user_id]);
        if ($referral->discount_state !== Referral::DISCOUNT_AVAILABLE) {
            throw new \DomainException("Cette invitation vient d'être utilisée sur une autre réservation.");
        }

        $referral->update(['discount_state' => Referral::DISCOUNT_RESERVED, 'discount_booking_id' => $booking->id]);
        $booking->update(['partner_referral_id' => $referral->id, 'referral_discount_amount' => $amount]);
    }

    /**
     * La réservation vient d'être confirmée (payée) : la remise est consommée, et les ambassadeurs du filleul qui n'avaient pas
     * encore été récompensés pour sa première réservation reçoivent leurs points.
     */
    public function onBookingConfirmed(Booking $booking): void
    {
        $user = $booking->user ?? User::find($booking->user_id);
        if (!$user) {
            return;
        }

        if ($booking->partner_referral_id) {
            Referral::where('id', $booking->partner_referral_id)->where('discount_booking_id', $booking->id)
                ->update(['discount_state' => Referral::DISCOUNT_USED]);
        }

        $points = self::bookingPoints();
        $referrals = Referral::with('partner')
            ->where('user_id', $user->id)
            ->whereNull('first_booking_at')
            ->where('created_at', '<=', $booking->created_at)
            ->get();

        foreach ($referrals as $referral) {
            if (!$referral->partner || !$referral->partner->is_active) {
                continue;
            }
            $referral->update([
                'first_booking_id' => $booking->id,
                'first_booking_at' => now(),
                'booking_points' => $points,
            ]);
            $this->creditOwed($referral->partner);
        }
    }

    /**
     * La réservation vient d'être annulée.
     *  - Avant paiement, ou annulée par l'établissement / l'administration / le système : la remise redevient utilisable ;
     *    les points déjà versés à l'ambassadeur restent acquis.
     *  - Payée puis annulée par le voyageur lui-même : la remise est perdue et les 50 points de première réservation sont retirés.
     */
    public function onBookingCancelled(Booking $booking, BookingStatus $from, ?int $actorId): void
    {
        $paid = $from === BookingStatus::Confirmed;
        $byTraveler = $actorId !== null && $actorId === (int) $booking->user_id;

        if ($booking->partner_referral_id) {
            Referral::where('id', $booking->partner_referral_id)->where('discount_booking_id', $booking->id)
                ->update($paid && $byTraveler
                    ? ['discount_state' => Referral::DISCOUNT_FORFEITED]
                    : ['discount_state' => Referral::DISCOUNT_AVAILABLE, 'discount_booking_id' => null]);
        }

        if (!($paid && $byTraveler)) {
            return;
        }

        Referral::with('partner.user')->where('first_booking_id', $booking->id)->get()->each(function (Referral $referral) use ($booking) {
            $owed = $referral->booking_points;
            if ($referral->booking_credited_at && $referral->partner?->user && $owed > 0) {
                app(LoyaltyService::class)->revokePoints(
                    $referral->partner->user, $owed, LoyaltyPointsTransaction::TYPE_PARTNER_BOOKING_REVERSAL, $booking,
                    'Parrainage — le filleul a annulé sa réservation : points retirés'
                );
            }
            // Sa prochaine réservation confirmée comptera comme sa première : l'ambassadeur n'est pas lésé, ni avantagé deux fois.
            $referral->update(['first_booking_id' => null, 'first_booking_at' => null, 'booking_points' => 0, 'booking_credited_at' => null]);
        });
    }

    /** À utiliser dans les hooks qui ne doivent jamais faire échouer une réservation ni une connexion. */
    public function safely(callable $callback): void
    {
        try {
            $callback($this);
        } catch (\Throwable $e) {
            Log::error('Parrainage ambassadeur : ' . $e->getMessage(), ['exception' => $e::class]);
        }
    }

    // ─── Chiffres ────────────────────────────────────────────────────────────────────────────────────────────

    /** Chiffres du tableau de bord : clics uniques, inscriptions, réservations, conversions, points distribués. */
    public function stats(ReferralPartner $partner): array
    {
        $clicks = (int) ReferralPartnerClick::where('referral_partner_id', $partner->id)->distinct()->count('visitor_hash');
        $referrals = Referral::where('referral_partner_id', $partner->id);

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
