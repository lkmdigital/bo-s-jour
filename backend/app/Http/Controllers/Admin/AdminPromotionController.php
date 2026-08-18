<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\Request;
use Carbon\Carbon;

/**
 * Supervision admin des offres créées par les établissements (Paramètres >
 * Promotions, "validation des offres créées par les établissements"). La
 * création reste côté hôte (PromotionController, par établissement) ; ce
 * module donne une vue transverse avec pouvoir de désactivation.
 */
class AdminPromotionController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = Promotion::with(['accommodation:id,name,city,host_id', 'accommodation.host:id,name', 'room:id,name']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('promo_code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('accommodation', function ($aq) use ($search) {
                      $aq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $today = Carbon::today()->toDateString();

        if ($request->filled('status')) {
            switch ($request->status) {
                case 'active':
                    $query->where('is_active', true)->where('start_date', '<=', $today)->where('end_date', '>=', $today);
                    break;
                case 'upcoming':
                    $query->where('is_active', true)->where('start_date', '>', $today);
                    break;
                case 'expired':
                    $query->where('end_date', '<', $today);
                    break;
                case 'disabled':
                    $query->where('is_active', false);
                    break;
            }
        }

        $promotions = $query->orderByDesc('created_at')->paginate($request->get('per_page', 20));

        $items = collect($promotions->items())->map(function (Promotion $promo) use ($today) {
            $status = 'disabled';
            if ($promo->is_active) {
                if ($promo->end_date->toDateString() < $today) {
                    $status = 'expired';
                } elseif ($promo->start_date->toDateString() > $today) {
                    $status = 'upcoming';
                } else {
                    $status = 'active';
                }
            } elseif ($promo->end_date->toDateString() < $today) {
                $status = 'expired';
            }

            return [
                'id' => $promo->id,
                'accommodation' => $promo->accommodation ? [
                    'id' => $promo->accommodation->id,
                    'name' => $promo->accommodation->name,
                    'city' => $promo->accommodation->city,
                    'host_name' => $promo->accommodation->host->name ?? null,
                ] : null,
                'room' => $promo->room ? ['id' => $promo->room->id, 'name' => $promo->room->name] : null,
                'discount_type' => $promo->discount_type,
                'discount_percent' => $promo->discount_percent,
                'discount_amount' => $promo->discount_amount,
                'promo_code' => $promo->promo_code,
                'start_date' => $promo->start_date,
                'end_date' => $promo->end_date,
                'description' => $promo->description,
                'is_active' => $promo->is_active,
                'computed_status' => $status,
                'created_at' => $promo->created_at,
            ];
        });

        return response()->json([
            'data' => $items,
            'pagination' => [
                'current_page' => $promotions->currentPage(),
                'last_page' => $promotions->lastPage(),
                'per_page' => $promotions->perPage(),
                'total' => $promotions->total(),
            ],
        ]);
    }

    /**
     * Activer/désactiver une offre (pouvoir de modération admin, sans contrainte
     * de propriété — contrairement à PromotionController::toggle() côté hôte).
     */
    public function toggle(Request $request, int $id)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $promotion = Promotion::findOrFail($id);
        $promotion->is_active = !$promotion->is_active;
        $promotion->save();

        return response()->json(['data' => $promotion->load('accommodation:id,name')]);
    }
}
