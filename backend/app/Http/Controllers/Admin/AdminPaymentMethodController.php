<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;

/**
 * Moyens de paiement proposés au voyageur — Paramètres > Facturation.
 * Gérés par la passerelle Malia Pay ; seule leur visibilité/ordre est piloté ici.
 */
class AdminPaymentMethodController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['data' => PaymentMethod::ordered()->get()]);
    }

    public function update(Request $request, int $id)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $method = PaymentMethod::findOrFail($id);
        $method->update($data);

        return response()->json(['data' => $method]);
    }
}
