<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\WithdrawalRequest;
use Illuminate\Http\Request;

class AdminWithdrawalController extends Controller
{
    public function index(Request $request)
    {
        $query = WithdrawalRequest::with(['host:id,name,email', 'processedBy:id,name'])
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $items = $query->paginate($request->get('per_page', 20));
        return response()->json($items);
    }

    public function approve(Request $request, int $id)
    {
        $request->validate(['admin_note' => 'nullable|string|max:500']);

        $withdrawal = WithdrawalRequest::with('host')->findOrFail($id);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $withdrawal->update([
            'status' => 'approved',
            'admin_note' => $request->admin_note,
            'processed_at' => now(),
            'processed_by' => $request->user()->id,
        ]);

        // Marquer les commissions comme payées (FIFO par released_at) jusqu'à couvrir le montant
        $remaining = (float) $withdrawal->amount;
        $commissions = Commission::where('host_id', $withdrawal->host_id)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->orderBy('released_at')
            ->get();
        foreach ($commissions as $c) {
            if ($remaining <= 0) {
                break;
            }
            $c->update(['status' => 'paid', 'paid_at' => now()]);
            $remaining -= (float) $c->host_amount;
        }

        return response()->json($withdrawal->load('host'));
    }

    public function reject(Request $request, int $id)
    {
        $request->validate(['admin_note' => 'nullable|string|max:500']);

        $withdrawal = WithdrawalRequest::findOrFail($id);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $withdrawal->update([
            'status' => 'rejected',
            'admin_note' => $request->admin_note,
            'processed_at' => now(),
            'processed_by' => $request->user()->id,
        ]);

        return response()->json($withdrawal->load('host'));
    }
}
