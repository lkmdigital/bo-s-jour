<?php

namespace App\Http\Controllers;

use App\Models\ClientCredit;
use Illuminate\Http\Request;

class ClientCreditController extends Controller
{
    /**
     * Liste des avoirs du client connecté + solde.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $credits = ClientCredit::where('user_id', $user->id)
            ->with(['sourceBooking:id,check_in,check_out,accommodation_id', 'sourceBooking.accommodation:id,name'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $balance = ClientCredit::balanceForUser($user->id);

        return response()->json([
            'balance' => $balance,
            'credits' => $credits,
        ]);
    }

    /**
     * Solde disponible uniquement.
     */
    public function balance(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return response()->json([
            'balance' => ClientCredit::balanceForUser($user->id),
            'currency' => 'XOF',
        ]);
    }
}
