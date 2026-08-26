<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CorporateAnnualReward;
use App\Models\CorporateRewardTier;
use Illuminate\Http\Request;

/**
 * Administration du Programme Corporate — Paramètres > Programme (doc client
 * §12 et §18 : "paramétrer les récompenses annuelles"). Paliers de CA
 * annuel → récompense, et consultation des récompenses déjà figées par
 * entreprise/année (corporate:compute-annual-rewards).
 */
class AdminCorporateController extends Controller
{
    protected function guard(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return null;
    }

    // ─── Paliers de CA annuel ────────────────────────────────────────────

    public function rewardTiers(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        return response()->json(['data' => CorporateRewardTier::ordered()->get()]);
    }

    public function storeRewardTier(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $data = $request->validate([
            'revenue_threshold' => 'required|numeric|min:0|unique:corporate_reward_tiers,revenue_threshold',
            'reward_label' => 'required|string|max:255',
            'sort_order' => 'nullable|integer',
            'active' => 'nullable|boolean',
        ]);
        $rewardTier = CorporateRewardTier::create($data);
        return response()->json(['data' => $rewardTier], 201);
    }

    public function updateRewardTier(Request $request, int $id)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }
        $rewardTier = CorporateRewardTier::findOrFail($id);
        $data = $request->validate([
            'revenue_threshold' => 'sometimes|numeric|min:0|unique:corporate_reward_tiers,revenue_threshold,' . $rewardTier->id,
            'reward_label' => 'sometimes|string|max:255',
            'sort_order' => 'sometimes|integer',
            'active' => 'sometimes|boolean',
        ]);
        $rewardTier->update($data);
        return response()->json(['data' => $rewardTier]);
    }

    // ─── Récompenses annuelles figées ────────────────────────────────────

    public function annualRewards(Request $request)
    {
        if ($forbidden = $this->guard($request)) {
            return $forbidden;
        }

        $query = CorporateAnnualReward::with(['owner:id,name,company_name,email', 'rewardTier:id,reward_label']);

        if ($request->filled('year')) {
            $query->where('year', (int) $request->year);
        }

        $rewards = $query->orderByDesc('year')->orderByDesc('revenue_total')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $rewards->items(),
            'pagination' => [
                'current_page' => $rewards->currentPage(),
                'last_page' => $rewards->lastPage(),
                'per_page' => $rewards->perPage(),
                'total' => $rewards->total(),
            ],
        ]);
    }
}
