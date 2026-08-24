<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\LoyaltyCampaign;
use App\Models\LoyaltyPointsTransaction;
use App\Models\LoyaltyRewardTier;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyVoucher;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Administration du programme de fidélité — Paramètres > Programme.
 * Niveaux, récompenses (paliers cagnotte → bon), campagnes, bons émis et
 * établissements participants, avec statistiques globales du programme.
 */
class AdminLoyaltyController extends Controller
{
    protected function guard(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return null;
    }

    /**
     * Statistiques globales du programme.
     */
    public function stats(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }

        $tierCounts = User::whereNotNull('loyalty_tier')
            ->selectRaw('loyalty_tier, count(*) as total')
            ->groupBy('loyalty_tier')
            ->pluck('total', 'loyalty_tier');

        return response()->json([
            'data' => [
                'members_by_tier' => $tierCounts,
                'points_awarded' => (int) LoyaltyPointsTransaction::where('points', '>', 0)->sum('points'),
                'points_redeemed' => (int) abs(LoyaltyPointsTransaction::where('points', '<', 0)->sum('points')),
                'vouchers_issued' => LoyaltyVoucher::count(),
                'vouchers_used' => LoyaltyVoucher::where('status', 'used')->count(),
                'vouchers_available' => LoyaltyVoucher::where('status', 'available')->count(),
                'participating_establishments' => Accommodation::whereNotNull('loyalty_program_joined_at')->count(),
                'total_establishments' => Accommodation::count(),
            ],
        ]);
    }

    // ─── Niveaux ─────────────────────────────────────────────────────────

    public function tiers(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        return response()->json(['data' => LoyaltyTier::ordered()->get()]);
    }

    public function storeTier(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $data = $request->validate([
            'key' => 'required|string|max:20|unique:loyalty_tiers,key',
            'label' => 'required|string|max:255',
            'min_points' => 'required|integer|min:0',
            'sort_order' => 'nullable|integer',
            'active' => 'nullable|boolean',
        ]);
        $tier = LoyaltyTier::create($data);
        return response()->json(['data' => $tier], 201);
    }

    public function updateTier(Request $request, int $id)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $tier = LoyaltyTier::findOrFail($id);
        $data = $request->validate([
            'label' => 'sometimes|string|max:255',
            'min_points' => 'sometimes|integer|min:0',
            'sort_order' => 'sometimes|integer',
            'active' => 'sometimes|boolean',
        ]);
        $tier->update($data);
        return response()->json(['data' => $tier]);
    }

    // ─── Récompenses (paliers cagnotte → bon) ───────────────────────────

    public function rewardTiers(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        return response()->json(['data' => LoyaltyRewardTier::ordered()->get()]);
    }

    public function storeRewardTier(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $data = $request->validate([
            'points_required' => 'required|integer|min:1|unique:loyalty_reward_tiers,points_required',
            'discount_percent' => 'required|numeric|min:0|max:100',
            'sort_order' => 'nullable|integer',
            'active' => 'nullable|boolean',
        ]);
        $rewardTier = LoyaltyRewardTier::create($data);
        return response()->json(['data' => $rewardTier], 201);
    }

    public function updateRewardTier(Request $request, int $id)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $rewardTier = LoyaltyRewardTier::findOrFail($id);
        $data = $request->validate([
            'discount_percent' => 'sometimes|numeric|min:0|max:100',
            'sort_order' => 'sometimes|integer',
            'active' => 'sometimes|boolean',
        ]);
        $rewardTier->update($data);
        return response()->json(['data' => $rewardTier]);
    }

    // ─── Campagnes ───────────────────────────────────────────────────────

    public function campaigns(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        return response()->json(['data' => LoyaltyCampaign::orderByDesc('starts_at')->get()]);
    }

    public function storeCampaign(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'required|in:double_points,triple_points,weekend_bonus,vacances_bonus,custom',
            'multiplier' => 'nullable|numeric|min:0',
            'bonus_points' => 'nullable|integer|min:0',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after_or_equal:starts_at',
            'active' => 'nullable|boolean',
        ]);
        $data['created_by'] = $request->user()->id;
        $campaign = LoyaltyCampaign::create($data);
        return response()->json(['data' => $campaign], 201);
    }

    public function updateCampaign(Request $request, int $id)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $campaign = LoyaltyCampaign::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'multiplier' => 'sometimes|nullable|numeric|min:0',
            'bonus_points' => 'sometimes|nullable|integer|min:0',
            'starts_at' => 'sometimes|date',
            'ends_at' => 'sometimes|date|after_or_equal:starts_at',
            'active' => 'sometimes|boolean',
        ]);
        $campaign->update($data);
        return response()->json(['data' => $campaign]);
    }

    // ─── Bons émis ───────────────────────────────────────────────────────

    public function vouchers(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }

        $query = LoyaltyVoucher::with('user:id,name,email');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $vouchers = $query->orderByDesc('issued_at')->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $vouchers->items(),
            'pagination' => [
                'current_page' => $vouchers->currentPage(),
                'last_page' => $vouchers->lastPage(),
                'per_page' => $vouchers->perPage(),
                'total' => $vouchers->total(),
            ],
        ]);
    }

    // ─── Établissements participants ───────────────────────────────────

    public function establishments(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }

        $accommodations = Accommodation::whereNotNull('loyalty_program_joined_at')
            ->with('host:id,name')
            ->orderByDesc('loyalty_program_joined_at')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => collect($accommodations->items())->map(fn (Accommodation $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'city' => $a->city,
                'host_name' => $a->host->name ?? null,
                'joined_at' => $a->loyalty_program_joined_at,
            ]),
            'pagination' => [
                'current_page' => $accommodations->currentPage(),
                'last_page' => $accommodations->lastPage(),
                'per_page' => $accommodations->perPage(),
                'total' => $accommodations->total(),
            ],
        ]);
    }
}
