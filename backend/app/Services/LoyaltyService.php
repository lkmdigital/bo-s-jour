<?php

namespace App\Services;

use App\Models\Booking;
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

            return $transaction;
        });
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

    protected function notify(User $user, string $type, string $message, array $data = []): void
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
    }
}
