<?php

namespace App\Http\Controllers;

use App\Models\Commission;
use App\Models\Booking;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RevenueController extends Controller
{
    /**
     * Obtenir les revenus de l'admin (commissions)
     */
    public function adminRevenue(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = Commission::with(['booking.accommodation', 'host', 'payment']);

        // Filtres
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Statistiques globales
        $totalCommissions = Commission::sum('commission_amount');
        $paidCommissions = Commission::where('status', 'paid')->sum('commission_amount');
        $pendingCommissions = Commission::where('status', 'pending')->sum('commission_amount');
        $totalBookings = Commission::count();

        // Revenus journaliers (aujourd'hui)
        $dailyCommissions = Commission::whereDate('created_at', Carbon::today())
            ->sum('commission_amount');
        $dailyBookings = Commission::whereDate('created_at', Carbon::today())
            ->count();

        // Revenus hebdomadaires (7 derniers jours)
        $weeklyCommissions = Commission::where('created_at', '>=', Carbon::now()->subDays(7))
            ->sum('commission_amount');
        $weeklyBookings = Commission::where('created_at', '>=', Carbon::now()->subDays(7))
            ->count();

        // Revenus mensuels (mois en cours)
        $monthlyCommissions = Commission::whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('commission_amount');
        $monthlyBookings = Commission::whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->count();

        // Revenus par période (tendance mensuelle)
        $monthlyRevenue = Commission::select(
            DB::raw('YEAR(created_at) as year'),
            DB::raw('MONTH(created_at) as month'),
            DB::raw('SUM(commission_amount) as total'),
            DB::raw('COUNT(*) as bookings')
        )
        ->groupBy('year', 'month')
        ->orderBy('year', 'desc')
        ->orderBy('month', 'desc')
        ->limit(12)
        ->get();

        // Liste des commissions
        $commissions = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'statistics' => [
                'total_commissions' => (float) $totalCommissions,
                'paid_commissions' => (float) $paidCommissions,
                'pending_commissions' => (float) $pendingCommissions,
                'total_bookings' => $totalBookings,
                'daily_commissions' => (float) $dailyCommissions,
                'daily_bookings' => $dailyBookings,
                'weekly_commissions' => (float) $weeklyCommissions,
                'weekly_bookings' => $weeklyBookings,
                'monthly_commissions' => (float) $monthlyCommissions,
                'monthly_bookings' => $monthlyBookings,
            ],
            'monthly_revenue' => $monthlyRevenue,
            'commissions' => $commissions,
        ]);
    }

    /**
     * Export CSV des commissions filtrées (compatible Excel).
     */
    public function exportCommissionsCsv(Request $request): StreamedResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403);
        }

        $query = Commission::with(['booking.accommodation', 'host']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $commissions = $query->orderByDesc('created_at')->get();
        $filename = 'commissions-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($commissions) {
            $out = fopen('php://output', 'w');
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($out, ['Date', 'Établissement', 'Hôte', 'Montant réservation (FCFA)', 'Commission (FCFA)', 'Montant hôte (FCFA)', 'Statut']);
            foreach ($commissions as $c) {
                fputcsv($out, [
                    optional($c->created_at)->format('Y-m-d H:i'),
                    $c->booking->accommodation->name ?? '',
                    $c->host->name ?? '',
                    $c->booking_amount,
                    $c->commission_amount,
                    $c->host_amount,
                    $c->status,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Obtenir les revenus de l'hôte
     */
    public function hostRevenue(Request $request)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $hostId = $request->user()->hostScopeId();

        $query = Commission::with(['booking.accommodation', 'payment'])
            ->where('host_id', $hostId);

        // Filtres
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Statistiques globales
        // Solde disponible pour retrait = commissions dont le séjour a commencé (released_at) et pas encore versées
        $availableBalance = (float) Commission::where('host_id', $hostId)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->sum('host_amount');
        $totalRevenue = Commission::where('host_id', $hostId)->sum('host_amount');
        $paidRevenue = Commission::where('host_id', $hostId)
            ->where('status', 'paid')
            ->sum('host_amount');
        $pendingRevenue = Commission::where('host_id', $hostId)
            ->where('status', 'pending')
            ->sum('host_amount');
        $awaitingCheckin = (float) Commission::where('host_id', $hostId)
            ->whereNull('released_at')
            ->sum('host_amount');
        $totalBookings = Commission::where('host_id', $hostId)->count();

        // Revenus par période
        $monthlyRevenue = Commission::select(
            DB::raw('YEAR(created_at) as year'),
            DB::raw('MONTH(created_at) as month'),
            DB::raw('SUM(host_amount) as total')
        )
        ->where('host_id', $hostId)
        ->groupBy('year', 'month')
        ->orderBy('year', 'desc')
        ->orderBy('month', 'desc')
        ->limit(12)
        ->get();

        // Liste des revenus
        $revenues = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'statistics' => [
                'total_revenue' => (float) $totalRevenue,
                'available_balance' => $availableBalance,
                'awaiting_checkin' => $awaitingCheckin,
                'paid_revenue' => (float) $paidRevenue,
                'pending_revenue' => (float) $pendingRevenue,
                'total_bookings' => $totalBookings,
            ],
            'monthly_revenue' => $monthlyRevenue,
            'revenues' => $revenues,
        ]);
    }

    /**
     * Mettre à jour le taux de commission (admin uniquement)
     */
    public function updateCommissionRate(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'commission_rate' => 'required|numeric|min:8|max:10',
        ]);

        $rate = round((float) $request->commission_rate, 2);
        Setting::set(
            'commission_rate',
            $rate,
            'number',
            'Taux de commission plateforme (8 à 10 %)'
        );

        return response()->json([
            'message' => 'Taux de commission mis à jour',
            'commission_rate' => $rate,
        ]);
    }

    /**
     * Obtenir le taux de commission actuel (borné entre 8 % et 10 %)
     */
    public function getCommissionRate(Request $request)
    {
        $rate = (float) Setting::get('commission_rate', 10.00);
        $rate = max(8.0, min(10.0, $rate));
        return response()->json(['commission_rate' => $rate]);
    }

    /**
     * Marquer une ou plusieurs commissions comme reversées (payées aux hôtels)
     */
    public function markCommissionsPaid(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'commission_ids' => 'required|array',
            'commission_ids.*' => 'integer|exists:commissions,id',
        ]);

        $updated = Commission::whereIn('id', $request->commission_ids)
            ->where('status', 'pending')
            ->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

        return response()->json([
            'message' => $updated . ' commission(s) marquée(s) comme reversée(s).',
            'updated_count' => $updated,
        ]);
    }
    }


