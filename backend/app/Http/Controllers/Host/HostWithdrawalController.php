<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\WithdrawalRequest;
use Illuminate\Http\Request;

class HostWithdrawalController extends Controller
{
    /**
     * Solde disponible pour retrait (commissions released, non encore versées).
     */
    public function availableBalance(Request $request)
    {
        $hostId = $request->user()->id;
        $balance = (float) Commission::where('host_id', $hostId)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->sum('host_amount');
        return response()->json(['available_balance' => $balance]);
    }

    /**
     * Liste des demandes de retrait de l'hôte.
     */
    public function index(Request $request)
    {
        $requests = WithdrawalRequest::where('host_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));
        return response()->json($requests);
    }

    /**
     * Créer une demande de retrait.
     */
    public function store(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1000',
            'payment_method' => 'nullable|string|max:50',
            'host_note' => 'nullable|string|max:500',
        ]);

        $hostId = $request->user()->id;
        $amount = (float) $request->amount;

        $available = (float) Commission::where('host_id', $hostId)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->sum('host_amount');

        if ($amount > $available) {
            return response()->json([
                'message' => 'Le montant demandé dépasse votre solde disponible (' . number_format($available, 0, ',', ' ') . ' FCFA).',
            ], 422);
        }

        $withdrawal = WithdrawalRequest::create([
            'host_id' => $hostId,
            'amount' => $amount,
            'status' => 'pending',
            'payment_method' => $request->payment_method,
            'host_note' => $request->host_note,
        ]);

        return response()->json($withdrawal, 201);
    }
}
