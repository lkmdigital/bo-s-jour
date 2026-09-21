<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Accommodation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HostClientController extends Controller
{
    /**
     * Liste des voyageurs distincts ayant réservé chez l'hôte, avec leurs statistiques.
     */
    public function index(Request $request)
    {
        $hostId = $request->user()->hostScopeId();
        $accommodationIds = Accommodation::where('host_id', $hostId)->pluck('id');

        $query = Booking::visibleToHost()->whereIn('accommodation_id', $accommodationIds)
            ->whereNotNull('user_id')
            ->join('users', 'bookings.user_id', '=', 'users.id');

        // Retour client 2026-09-18 : recherche + plage de dernier séjour —
        // absentes jusqu'ici, alors que l'admin dispose déjà de filtres
        // équivalents sur ses propres listes.
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.email', 'like', "%{$search}%")
                    ->orWhere('users.phone', 'like', "%{$search}%");
            });
        }

        $clients = $query
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'users.phone',
                DB::raw('COUNT(bookings.id) as bookings_count'),
                DB::raw('SUM(CASE WHEN bookings.status = "confirmed" THEN bookings.total_price ELSE 0 END) as total_spent'),
                DB::raw('MAX(bookings.check_in) as last_stay'),
                DB::raw('SUM(CASE WHEN bookings.status = "cancelled" THEN 1 ELSE 0 END) as cancelled_count')
            )
            ->groupBy('users.id', 'users.name', 'users.email', 'users.phone')
            ->when($request->filled('from_date'), fn ($q) => $q->havingRaw('MAX(bookings.check_in) >= ?', [$request->from_date]))
            ->when($request->filled('to_date'), fn ($q) => $q->havingRaw('MAX(bookings.check_in) <= ?', [$request->to_date]))
            ->orderByDesc('last_stay')
            ->paginate($request->get('per_page', 20));

        return response()->json($clients);
    }
}
