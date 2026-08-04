<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Payment;
use App\Models\Promotion;
use App\Models\Inspection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Controller pour le dashboard admin avec analytics
 */
class AdminDashboardController extends Controller
{
    /**
     * Statistiques générales du dashboard
     */
    public function stats(Request $request)
    {
        if ($request->has('from_date') && $request->has('to_date')) {
            $startDate = Carbon::parse($request->from_date)->startOfDay();
            $endDate = Carbon::parse($request->to_date)->endOfDay();
            $period = (int) $startDate->diffInDays($endDate) ?: 1;
        } else {
            $period = (int) $request->get('period', 30);
            $startDate = Carbon::now()->subDays($period)->startOfDay();
            $endDate = Carbon::now()->endOfDay();
        }

        // Utilisateurs
        $totalUsers = User::count();
        $activeUsers = User::where('status', 'active')->count();
        $blockedUsers = User::where('status', 'blocked')->count();
        $newUsers = User::where('created_at', '>=', $startDate)->count();

        // Hôtes
        $totalHosts = User::where('role', 'host')->count();
        $verifiedHosts = User::where('role', 'host')->where('profile_verified', true)->count();
        $pendingHosts = User::where('role', 'host')->where('profile_verified', false)->count();
        // Hôtes rejetés : ceux qui ont au moins une validation avec action 'rejected'
        try {
            $rejectedHosts = User::where('role', 'host')
                ->whereHas('hostValidationHistory', function ($q) {
                    $q->where('action', 'rejected');
                })
                ->count();
        } catch (\Throwable $e) {
            \Log::warning('AdminDashboardController::stats hostValidationHistory: ' . $e->getMessage());
            $rejectedHosts = 0;
        }

        // Établissements
        $totalAccommodations = Accommodation::count();
        $publishedAccommodations = Accommodation::where('status', 'published')->count();
        $pendingAccommodations = Accommodation::where('status', 'pending')->count();
        $rejectedAccommodations = Accommodation::where('status', 'rejected')->count();
        $removedAccommodations = Accommodation::where('status', 'removed')->count();
        $disabledAccommodations = Accommodation::where('status', 'disabled')->count();

        // Réservations
        $totalBookings = Booking::count();
        $confirmedBookings = Booking::where('status', 'confirmed')->count();
        $cancelledBookings = Booking::where('status', 'cancelled')->count();
        $pendingBookings = Booking::where('status', 'pending')->count();
        $newBookings = Booking::where('created_at', '>=', $startDate)->count();
        // Réservations modifiées (updated_at > created_at avec écart significatif)
        $modifiedBookings = Booking::whereRaw('updated_at > DATE_ADD(created_at, INTERVAL 1 MINUTE)')->count();

        // Comptabilité : commissions et reversements
        $commissionsDue = (float) Commission::where('status', 'pending')->sum('host_amount');
        $commissionsReversed = (float) Commission::where('status', 'paid')->sum('host_amount');
        $platformCommissionsTotal = (float) Commission::sum('commission_amount');
        $platformCommissionsPending = (float) Commission::where('status', 'pending')->sum('commission_amount');
        $platformCommissionsPaid = (float) Commission::where('status', 'paid')->sum('commission_amount');

        // Promotions actives (à la date du jour)
        $today = Carbon::today();
        $activePromotionsCount = Promotion::where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->count();

        // Revenus
        $totalRevenue = Payment::where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->sum('amount');
        $totalRevenueAllTime = Payment::where('status', 'completed')->sum('amount');
        $revenueToday = (float) Payment::where('status', 'completed')
            ->whereDate('created_at', Carbon::today())
            ->sum('amount');
        $revenueThisMonth = (float) Payment::where('status', 'completed')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('amount');
        $revenueThisYear = (float) Payment::where('status', 'completed')
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('amount');

        // Inspections
        $totalInspections = Inspection::count();
        $completedInspections = Inspection::where('status', 'completed')->count();
        $approvedInspections = Inspection::where('result', 'approved')->count();
        $rejectedInspections = Inspection::where('result', 'rejected')->count();

        // KPI : RevPAR, taux d'occupation, prix moyen (sur les 30 derniers jours)
        $kpiDays = 30;
        $kpiStart = Carbon::now()->subDays($kpiDays)->startOfDay();
        $kpiEnd = Carbon::now()->endOfDay();
        $roomNightsSold = 0;
        $totalRoomsKpi = 0;
        $revenueKpiPeriod = 0.0;
        $revpar = 0.0;
        $occupancyRate = 0.0;
        $averagePricePerRoom = 0.0;
        try {
            $roomNightsSold = Booking::where('status', 'confirmed')
                ->where(function ($q) use ($kpiStart, $kpiEnd) {
                    $q->whereBetween('check_in', [$kpiStart, $kpiEnd])
                        ->orWhereBetween('check_out', [$kpiStart, $kpiEnd])
                        ->orWhere(function ($q2) use ($kpiStart, $kpiEnd) {
                            $q2->where('check_in', '<=', $kpiStart)->where('check_out', '>=', $kpiEnd);
                        });
                })
                ->get()
                ->sum(function ($b) use ($kpiStart, $kpiEnd) {
                    $cin = Carbon::parse($b->check_in)->startOfDay();
                    $cout = Carbon::parse($b->check_out)->startOfDay();
                    $overlapStart = $cin->lt($kpiStart) ? $kpiStart->copy() : $cin->copy();
                    $overlapEnd = $cout->gt($kpiEnd) ? $kpiEnd->copy() : $cout->copy();
                    return max(0, $overlapStart->diffInDays($overlapEnd));
                });
            $totalRoomsKpi = (int) DB::table('rooms')->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
                ->where('accommodations.status', 'published')
                ->count();
            $roomNightsAvailable = $totalRoomsKpi * $kpiDays;
            $occupancyRate = $roomNightsAvailable > 0 ? round(($roomNightsSold / $roomNightsAvailable) * 100, 2) : 0.0;
            $revenueKpiPeriod = (float) Booking::where('status', 'confirmed')
                ->where(function ($q) use ($kpiStart, $kpiEnd) {
                    $q->whereBetween('check_in', [$kpiStart, $kpiEnd])
                        ->orWhereBetween('check_out', [$kpiStart, $kpiEnd])
                        ->orWhere(function ($q2) use ($kpiStart, $kpiEnd) {
                            $q2->where('check_in', '<=', $kpiStart)->where('check_out', '>=', $kpiEnd);
                        });
                })
                ->get()
                ->sum(function ($b) use ($kpiStart, $kpiEnd) {
                    $cin = Carbon::parse($b->check_in)->startOfDay();
                    $cout = Carbon::parse($b->check_out)->startOfDay();
                    $overlapStart = $cin->lt($kpiStart) ? $kpiStart->copy() : $cin->copy();
                    $overlapEnd = $cout->gt($kpiEnd) ? $kpiEnd->copy() : $cout->copy();
                    $overlapNights = max(0, $overlapStart->diffInDays($overlapEnd));
                    $totalNights = max(1, $cin->diffInDays($cout));
                    $pricePerNight = (float) $b->total_price / $totalNights;
                    return $overlapNights * $pricePerNight;
                });
            $revpar = $roomNightsAvailable > 0 ? round($revenueKpiPeriod / $roomNightsAvailable, 2) : 0.0;
            $averagePricePerRoom = $roomNightsSold > 0 ? round($revenueKpiPeriod / $roomNightsSold, 2) : 0.0;
        } catch (\Throwable $e) {
            \Log::warning('AdminDashboardController::stats KPI/rooms: ' . $e->getMessage());
        }
        $roomNightsAvailable = $totalRoomsKpi * $kpiDays;

        return response()->json([
            'data' => [
                'users' => [
                    'total' => $totalUsers,
                    'active' => $activeUsers,
                    'blocked' => $blockedUsers,
                    'new' => $newUsers,
                ],
                'hosts' => [
                    'total' => $totalHosts,
                    'verified' => $verifiedHosts,
                    'pending' => $pendingHosts,
                    'rejected' => $rejectedHosts,
                ],
                'accommodations' => [
                    'total' => $totalAccommodations,
                    'published' => $publishedAccommodations,
                    'pending' => $pendingAccommodations,
                    'rejected' => $rejectedAccommodations,
                    'removed' => $removedAccommodations,
                    'disabled' => $disabledAccommodations,
                ],
                'bookings' => [
                    'total' => $totalBookings,
                    'confirmed' => $confirmedBookings,
                    'cancelled' => $cancelledBookings,
                    'pending' => $pendingBookings,
                    'modified' => $modifiedBookings,
                    'new' => $newBookings,
                ],
                'accounting' => [
                    'commissions_due' => $commissionsDue,
                    'commissions_reversed' => $commissionsReversed,
                    'platform_commissions_total' => $platformCommissionsTotal,
                    'platform_commissions_pending' => $platformCommissionsPending,
                    'platform_commissions_paid' => $platformCommissionsPaid,
                ],
                'promotions' => [
                    'active_count' => $activePromotionsCount,
                ],
                'revenue' => [
                    'period' => $totalRevenue,
                    'all_time' => $totalRevenueAllTime,
                    'period_days' => $period,
                    'today' => $revenueToday,
                    'this_month' => $revenueThisMonth,
                    'this_year' => $revenueThisYear,
                ],
                'inspections' => [
                    'total' => $totalInspections,
                    'completed' => $completedInspections,
                    'approved' => $approvedInspections,
                    'rejected' => $rejectedInspections,
                ],
                'kpis' => [
                    'revpar' => $revpar,
                    'total_revenue' => $revenueKpiPeriod,
                    'occupancy_rate' => $occupancyRate,
                    'average_price_per_room' => $averagePricePerRoom,
                    'room_nights_sold' => $roomNightsSold,
                    'room_nights_available' => $roomNightsAvailable,
                    'period_days' => $kpiDays,
                ],
            ],
        ]);
    }

    /**
     * Graphique d'activité journalière
     */
    public function dailyActivity(Request $request)
    {
        if ($request->has('from_date') && $request->has('to_date')) {
            $startDate = Carbon::parse($request->from_date)->startOfDay();
            $endDate = Carbon::parse($request->to_date)->endOfDay();
        } else {
            $period = (int) $request->get('period', 30);
            $startDate = Carbon::now()->subDays($period)->startOfDay();
            $endDate = Carbon::now()->endOfDay();
        }

        $data = [];

        // Parcourir chaque jour
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            $dayStart = $currentDate->copy()->startOfDay();
            $dayEnd = $currentDate->copy()->endOfDay();

            $data[] = [
                'date' => $currentDate->format('Y-m-d'),
                'users' => User::whereBetween('created_at', [$dayStart, $dayEnd])->count(),
                'bookings' => Booking::whereBetween('created_at', [$dayStart, $dayEnd])->count(),
                'accommodations' => Accommodation::whereBetween('created_at', [$dayStart, $dayEnd])->count(),
                'revenue' => Payment::where('status', 'completed')
                    ->whereBetween('created_at', [$dayStart, $dayEnd])
                    ->sum('amount'),
            ];

            $currentDate->addDay();
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Graphique des performances des hôtes
     */
    public function hostPerformance(Request $request)
    {
        $limit = $request->get('limit', 10);

        $hosts = User::where('role', 'host')
            ->withCount([
                'accommodations',
                'bookings',
            ])
            ->withSum('accommodations', 'total_reviews')
            ->orderBy('accommodations_count', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($host) {
                return [
                    'id' => $host->id,
                    'name' => $host->name,
                    'establishment_name' => $host->establishment_name,
                    'accommodations_count' => $host->accommodations_count,
                    'bookings_count' => $host->bookings_count,
                    'total_reviews' => $host->accommodations_sum_total_reviews ?? 0,
                ];
            });

        return response()->json(['data' => $hosts]);
    }

    /**
     * Répartition des états des biens
     */
    public function accommodationStatusDistribution()
    {
        $distribution = Accommodation::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'status' => $item->status,
                    'count' => $item->count,
                ];
            });

        return response()->json(['data' => $distribution]);
    }

    /**
     * Réservations et CA par ville (proxy de "région" tant qu'aucun champ région dédié n'existe).
     */
    public function bookingsByRegion()
    {
        $data = Booking::join('accommodations', 'bookings.accommodation_id', '=', 'accommodations.id')
            ->where('bookings.status', 'confirmed')
            ->select(
                'accommodations.city',
                DB::raw('COUNT(bookings.id) as bookings_count'),
                DB::raw('SUM(bookings.total_price) as revenue')
            )
            ->groupBy('accommodations.city')
            ->orderByDesc('bookings_count')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                return [
                    'city' => $row->city,
                    'bookings_count' => (int) $row->bookings_count,
                    'revenue' => (float) $row->revenue,
                ];
            });

        return response()->json(['data' => $data]);
    }

    /**
     * Top établissements par CA / nombre de réservations (tous hôtes confondus).
     */
    public function topAccommodations(Request $request)
    {
        $limit = (int) $request->get('limit', 10);

        $data = Accommodation::withCount(['bookings' => function ($q) {
                $q->where('status', 'confirmed');
            }])
            ->withSum(['bookings' => function ($q) {
                $q->where('status', 'confirmed');
            }], 'total_price')
            ->orderByDesc('bookings_sum_total_price')
            ->limit($limit)
            ->get()
            ->map(function ($accommodation) {
                return [
                    'id' => $accommodation->id,
                    'name' => $accommodation->name,
                    'city' => $accommodation->city,
                    'bookings_count' => $accommodation->bookings_count,
                    'revenue' => (float) ($accommodation->bookings_sum_total_price ?? 0),
                ];
            });

        return response()->json(['data' => $data]);
    }

    /**
     * Évolution du chiffre d'affaires et des commissions sur les 12 derniers mois.
     */
    public function monthlyRevenueTrend()
    {
        $startDate = Carbon::now()->subMonths(11)->startOfMonth();

        $revenueByMonth = Payment::where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('SUM(amount) as revenue'))
            ->groupBy('month')
            ->pluck('revenue', 'month');

        $commissionsByMonth = Commission::where('created_at', '>=', $startDate)
            ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('SUM(commission_amount) as commissions'))
            ->groupBy('month')
            ->pluck('commissions', 'month');

        $data = [];
        $cursor = $startDate->copy();
        for ($i = 0; $i < 12; $i++) {
            $key = $cursor->format('Y-m');
            $data[] = [
                'month' => $key,
                'revenue' => (float) ($revenueByMonth[$key] ?? 0),
                'commissions' => (float) ($commissionsByMonth[$key] ?? 0),
            ];
            $cursor->addMonth();
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Tendance du taux d'occupation moyen sur les 12 derniers mois (tous établissements publiés).
     */
    public function occupancyTrend()
    {
        $totalRooms = (int) DB::table('rooms')
            ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
            ->where('accommodations.status', 'published')
            ->count();

        $data = [];
        $cursor = Carbon::now()->subMonths(11)->startOfMonth();
        for ($i = 0; $i < 12; $i++) {
            $monthStart = $cursor->copy()->startOfMonth();
            $monthEnd = $cursor->copy()->endOfMonth();
            $daysInMonth = $monthStart->daysInMonth;

            $roomNightsSold = Booking::where('status', 'confirmed')
                ->where('check_in', '<=', $monthEnd)
                ->where('check_out', '>=', $monthStart)
                ->get()
                ->sum(function ($b) use ($monthStart, $monthEnd) {
                    $start = Carbon::parse($b->check_in)->max($monthStart);
                    $end = Carbon::parse($b->check_out)->min($monthEnd);
                    return max(0, $start->diffInDays($end));
                });

            $availableNights = $totalRooms * $daysInMonth;

            $data[] = [
                'month' => $monthStart->format('Y-m'),
                'occupancy_rate' => $availableNights > 0 ? round(($roomNightsSold / $availableNights) * 100, 2) : 0,
            ];
            $cursor->addMonth();
        }

        return response()->json(['data' => $data]);
    }
}

