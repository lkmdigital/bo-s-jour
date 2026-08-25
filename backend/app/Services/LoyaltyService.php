<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\LoyaltyCampaign;
use App\Models\LoyaltyPointsTransaction;
use App\Models\LoyaltyRewardTier;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyVoucher;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\LoyaltyEventNotification;
use Illuminate\Support\Facades\DB;

/**
 * Logique centrale du programme de fidélité — attribution de points, montée de
 * niveau (jamais rétrogradée), réclamation et application de bons de réduction.
 * Voir design-refonte/brief/Programme de Fidélité .docx pour la spec client.
 */
class LoyaltyService
{
    /**
     * Crédite des points à un voyageur (cagnotte ET compteur à vie), écrit la
     * ligne de grand livre correspondante, et fait progresser le niveau si le
     * seuil à vie est franchi. $points doit être positif — pour un débit
     * (réclamation de bon), voir claimVoucher().
     */
    public function awardPoints(User $user, int $points, string $type, ?Booking $booking = null, ?string $description = null): LoyaltyPointsTransaction
    {
        return DB::transaction(function () use ($user, $points, $type, $booking, $description) {
            $balanceBefore = (int) $user->loyalty_points_balance;

            $transaction = LoyaltyPointsTransaction::create([
                'user_id' => $user->id,
                'points' => $points,
                'type' => $type,
                'booking_id' => $booking?->id,
                'description' => $description,
            ]);

            $user->increment('loyalty_points_lifetime', $points);
            $user->increment('loyalty_points_balance', $points);

            $defaultMessage = $points >= 0
                ? "Vous avez gagné {$points} points de fidélité."
                : abs($points) . ' points de fidélité ont été retirés de votre compte.';

            $this->notify($user, $type, $description ?? $defaultMessage, [
                'points' => $points,
                'booking_id' => $booking?->id,
            ]);

            $this->upgradeTierIfEligible($user);

            if ($points > 0) {
                $this->notifyIfApproachingReward($user, $balanceBefore);
            }

            return $transaction;
        });
    }

    /**
     * Prévient le voyageur lorsqu'un gain de points le fait passer sous la
     * barre des 100 points restants avant sa prochaine récompense de cagnotte
     * — une seule fois par palier (ne renotifie pas à chaque gain suivant tant
     * que le palier n'est pas franchi, en comparant au solde avant ce gain).
     */
    protected function notifyIfApproachingReward(User $user, int $balanceBefore): void
    {
        $threshold = 100;

        $nextTier = LoyaltyRewardTier::active()->ordered()
            ->where('points_required', '>', $balanceBefore)
            ->first();

        if (!$nextTier) {
            return;
        }

        $remainingNow = $nextTier->points_required - $user->loyalty_points_balance;
        $remainingBefore = $nextTier->points_required - $balanceBefore;

        if ($remainingNow > 0 && $remainingNow <= $threshold && $remainingBefore > $threshold) {
            $this->notify(
                $user,
                'approaching_reward',
                "Plus que {$remainingNow} points pour votre prochaine récompense (-{$nextTier->discount_percent}%) !",
                ['reward_tier_id' => $nextTier->id, 'points_remaining' => $remainingNow]
            );
        }
    }

    /**
     * Bonus de parrainage : crédité au parrain ET au filleul lors du premier
     * séjour terminé du filleul (pas à l'inscription — le document client est
     * explicite : "utilise ce code ET réalise son premier séjour"). Appelé
     * depuis AwardLoyaltyPoints, dans le même passage que le bonus de
     * première réservation — n'a donc besoin d'aucune idempotence propre :
     * un utilisateur ne peut avoir "sa première réservation" qu'une fois.
     */
    public function creditReferralBonus(User $filleul): void
    {
        if (!$filleul->referred_by_user_id) {
            return;
        }

        $parrain = User::find($filleul->referred_by_user_id);
        if (!$parrain) {
            return;
        }

        $bonusFilleul = (int) Setting::get('loyalty_referral_bonus_filleul', 50);
        $bonusParrain = (int) Setting::get('loyalty_referral_bonus_parrain', 50);

        if ($bonusFilleul > 0) {
            $this->awardPoints(
                $filleul,
                $bonusFilleul,
                LoyaltyPointsTransaction::TYPE_REFERRAL_FILLEUL,
                null,
                "Bonus de parrainage — bienvenue via le code de {$parrain->name}"
            );
        }

        if ($bonusParrain > 0) {
            $this->awardPoints(
                $parrain,
                $bonusParrain,
                LoyaltyPointsTransaction::TYPE_REFERRAL_PARRAIN,
                null,
                "Bonus de parrainage — {$filleul->name} a réalisé son premier séjour"
            );
        }
    }

    /**
     * Fait passer le voyageur au niveau le plus élevé pour lequel il est
     * éligible (jamais de rétrogradation, même si les seuils changent ensuite).
     */
    protected function upgradeTierIfEligible(User $user): void
    {
        $tiers = LoyaltyTier::active()->ordered()->get();
        if ($tiers->isEmpty()) {
            return;
        }

        $currentSortOrder = $tiers->firstWhere('key', $user->loyalty_tier)?->sort_order ?? -1;

        $eligibleTier = $tiers
            ->filter(fn (LoyaltyTier $t) => $user->loyalty_points_lifetime >= $t->min_points)
            ->sortByDesc('sort_order')
            ->first();

        if ($eligibleTier && $eligibleTier->sort_order > $currentSortOrder) {
            $user->update(['loyalty_tier' => $eligibleTier->key]);

            $this->notify(
                $user,
                'tier_upgrade',
                "Félicitations, vous êtes passé au niveau {$eligibleTier->label} !",
                ['tier' => $eligibleTier->key]
            );
        }
    }

    /**
     * Réclame une récompense de la cagnotte : débite les points requis et émet
     * un bon de réduction utilisable sur une réservation future.
     */
    public function claimVoucher(User $user, LoyaltyRewardTier $rewardTier): LoyaltyVoucher
    {
        if (!$rewardTier->active) {
            throw new \RuntimeException("Cette récompense n'est plus disponible.");
        }

        if ($user->loyalty_points_balance < $rewardTier->points_required) {
            throw new \RuntimeException('Solde de points insuffisant pour réclamer cette récompense.');
        }

        return DB::transaction(function () use ($user, $rewardTier) {
            $validityDays = (int) Setting::get('loyalty_voucher_validity_days', 180);

            $voucher = LoyaltyVoucher::create([
                'user_id' => $user->id,
                'reward_tier_id' => $rewardTier->id,
                'code' => LoyaltyVoucher::generateCode(),
                'discount_percent' => $rewardTier->discount_percent,
                'issued_at' => now(),
                'expires_at' => $validityDays > 0 ? now()->addDays($validityDays) : null,
                'status' => 'available',
            ]);

            LoyaltyPointsTransaction::create([
                'user_id' => $user->id,
                'points' => -$rewardTier->points_required,
                'type' => LoyaltyPointsTransaction::TYPE_VOUCHER_CLAIMED,
                'voucher_id' => $voucher->id,
                'description' => "Bon {$voucher->code} réclamé ({$rewardTier->discount_percent}% de réduction)",
            ]);

            $user->decrement('loyalty_points_balance', $rewardTier->points_required);

            $this->notify(
                $user,
                'voucher_claimed',
                "Votre bon de réduction {$voucher->code} ({$rewardTier->discount_percent}%) est prêt à être utilisé.",
                ['voucher_id' => $voucher->id, 'voucher_code' => $voucher->code]
            );

            return $voucher;
        });
    }

    /**
     * Applique un bon déjà émis à une réservation : calcule la réduction
     * (même formule que Promotion::computeDiscount) et marque le bon utilisé.
     * N'insère PAS la réservation elle-même — appelé par BookingController::store()
     * une fois la réservation créée, dans la même transaction.
     */
    public function applyVoucherToBooking(Booking $booking, LoyaltyVoucher $voucher): float
    {
        if ($voucher->user_id !== $booking->user_id) {
            throw new \RuntimeException("Ce bon n'appartient pas à ce voyageur.");
        }

        if (!$voucher->isAvailable()) {
            throw new \RuntimeException("Ce bon n'est plus disponible.");
        }

        $discount = $voucher->computeDiscount((float) $booking->total_price);

        $voucher->update([
            'status' => 'used',
            'used_for_booking_id' => $booking->id,
            'used_at' => now(),
        ]);

        return $discount;
    }

    /**
     * Campagne active la plus avantageuse à l'instant présent (comme
     * Promotion::computeDiscount() pour les réservations : une seule campagne
     * s'applique, jamais de cumul).
     */
    public function bestActiveCampaign(): ?LoyaltyCampaign
    {
        return LoyaltyCampaign::where('active', true)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->get()
            ->sortByDesc(fn (LoyaltyCampaign $c) => (float) ($c->multiplier ?? 1))
            ->first();
    }

    public function notify(User $user, string $type, string $message, array $data = []): void
    {
        try {
            $user->notify(new LoyaltyEventNotification($type, $message, $data));
        } catch (\Throwable $e) {
            \Log::warning('Échec notification programme fidélité', [
                'user_id' => $user->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }

        // Canal WhatsApp — même principe que SendPostStayReviewLinks : pas un
        // canal Notification standard dans ce projet, envoyé séparément via
        // WhatsAppService (no-op silencieux si l'intégration n'est pas
        // configurée par l'admin, ou si le voyageur n'a pas opté in).
        if ($user->notif_whatsapp && ($user->whatsapp || $user->phone)) {
            try {
                app(WhatsAppService::class)->sendText($user->whatsapp ?: $user->phone, "bo séjour — {$message}");
            } catch (\Throwable $e) {
                \Log::warning('Échec notification WhatsApp fidélité', [
                    'user_id' => $user->id,
                    'type' => $type,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
