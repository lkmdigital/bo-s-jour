<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyCampaign;
use App\Models\LoyaltyRewardTier;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyVoucher;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LoyaltyController extends Controller
{
    public function __construct(private LoyaltyService $loyaltyService) {}

    /**
     * Tableau de bord "Mon programme fidélité" : niveau, points, progression,
     * bons disponibles, code de parrainage.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        if (empty($user->referral_code)) {
            $user->update(['referral_code' => $this->generateReferralCode()]);
        }

        $tiers = LoyaltyTier::active()->ordered()->get();
        $currentTier = $tiers->firstWhere('key', $user->loyalty_tier);
        $nextTier = $tiers->first(fn (LoyaltyTier $t) => $t->min_points > $user->loyalty_points_lifetime);

        $vouchers = LoyaltyVoucher::where('user_id', $user->id)
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn (LoyaltyVoucher $v) => [
                'id' => $v->id,
                'code' => $v->code,
                'discount_percent' => (float) $v->discount_percent,
                'status' => $v->status,
                'issued_at' => $v->issued_at,
                'expires_at' => $v->expires_at,
                'used_at' => $v->used_at,
            ]);

        $rewardTiers = LoyaltyRewardTier::active()->ordered()->get()->map(fn (LoyaltyRewardTier $rt) => [
            'id' => $rt->id,
            'points_required' => $rt->points_required,
            'discount_percent' => (float) $rt->discount_percent,
            'claimable' => $user->loyalty_points_balance >= $rt->points_required,
        ]);

        // "Mes bonus" (doc §16) : bons disponibles (ci-dessus), code de
        // parrainage et campagnes en cours — jusqu'ici absentes de cet espace
        // alors qu'administrables depuis longtemps côté admin.
        $activeCampaigns = LoyaltyCampaign::currentlyActive()
            ->orderBy('ends_at')
            ->get()
            ->map(fn (LoyaltyCampaign $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'type' => $c->type,
                'multiplier' => $c->multiplier !== null ? (float) $c->multiplier : null,
                'bonus_points' => $c->bonus_points,
                'ends_at' => $c->ends_at,
            ]);

        return response()->json([
            'data' => [
                'tier' => $currentTier ? [
                    'key' => $currentTier->key,
                    'label' => $currentTier->label,
                ] : null,
                'next_tier' => $nextTier ? [
                    'key' => $nextTier->key,
                    'label' => $nextTier->label,
                    'min_points' => $nextTier->min_points,
                    'points_remaining' => max(0, $nextTier->min_points - $user->loyalty_points_lifetime),
                ] : null,
                'points_lifetime' => $user->loyalty_points_lifetime,
                'points_balance' => $user->loyalty_points_balance,
                'referral_code' => $user->referral_code,
                'reward_tiers' => $rewardTiers,
                'vouchers' => $vouchers,
                'active_campaigns' => $activeCampaigns,
            ],
        ]);
    }

    /**
     * Historique des mouvements de points (pagination).
     */
    public function history(Request $request)
    {
        $transactions = $request->user()
            ->loyaltyPointsTransactions()
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => collect($transactions->items())->map(fn ($t) => [
                'id' => $t->id,
                'points' => $t->points,
                'type' => $t->type,
                'label' => \App\Models\LoyaltyPointsTransaction::LABELS[$t->type] ?? $t->type,
                'description' => $t->description,
                'booking_id' => $t->booking_id,
                'created_at' => $t->created_at,
            ]),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Réclame une récompense de la cagnotte : émet un bon de réduction.
     */
    public function claimVoucher(Request $request)
    {
        $request->validate([
            'reward_tier_id' => 'required|integer|exists:loyalty_reward_tiers,id',
        ]);

        $rewardTier = LoyaltyRewardTier::findOrFail($request->reward_tier_id);

        try {
            $voucher = $this->loyaltyService->claimVoucher($request->user(), $rewardTier);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $voucher], 201);
    }

    protected function generateReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (\App\Models\User::where('referral_code', $code)->exists());

        return $code;
    }
}
