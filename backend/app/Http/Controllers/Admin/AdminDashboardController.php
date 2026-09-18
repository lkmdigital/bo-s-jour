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

        // Retour client 2026-09-18 : "les filtres ne s'appliquent pas à la vue
        // d'ensemble et aux KPI" — quand from_date/to_date sont fournis, TOUS
        // les compteurs et montants sont restreints à la période (date de
        // création de chaque élément) ; sans filtre, comportement historique
        // (totaux toutes périodes).
        $hasPeriod = $request->has('from_date') && $request->has('to_date');
        $inPeriod = fn ($q, string $col = 'created_at') => $hasPeriod ? $q->whereBetween($col, [$startDate, $endDate]) : $q;
        // Point de référence des revenus "du jour / du mois / annuels" : fin de période.
        $refDate = $hasPeriod ? $endDate->copy() : Carbon::now();

        // Utilisateurs
        $totalUsers = $inPeriod(User::query())->count();
        $activeUsers = $inPeriod(User::where('status', 'active'))->count();
        $blockedUsers = $inPeriod(User::where('status', 'blocked'))->count();
        $newUsers = User::where('created_at', '>=', $startDate)->count();

        // Hôtes
        $totalHosts = $inPeriod(User::where('role', 'host'))->count();
        $verifiedHosts = $inPeriod(User::where('role', 'host')->where('profile_verified', true))->count();
        $pendingHosts = $inPeriod(User::where('role', 'host')->where('profile_verified', false))->count();
        // Hôtes rejetés : ceux qui ont au moins une validation avec action 'rejected'
        try {
            $rejectedHosts = $inPeriod(User::where('role', 'host')
                ->whereHas('hostValidationHistory', function ($q) {
                    $q->where('action', 'rejected');
                }))
                ->count();
        } catch (\Throwable $e) {
            \Log::warning('AdminDashboardController::stats hostValidationHistory: ' . $e->getMessage());
            $rejectedHosts = 0;
        }

        // Établissements
        $totalAccommodations = $inPeriod(Accommodation::query())->count();
        $publishedAccommodations = $inPeriod(Accommodation::where('status', 'published'))->count();
        $pendingAccommodations = $inPeriod(Accommodation::where('status', 'pending'))->count();
        $rejectedAccommodations = $inPeriod(Accommodation::where('status', 'rejected'))->count();
        $removedAccommodations = $inPeriod(Accommodation::where('status', 'removed'))->count();
        $disabledAccommodations = $inPeriod(Accommodation::where('status', 'disabled'))->count();

        // Réservations
        $totalBookings = $inPeriod(Booking::query())->count();
        $confirmedBookings = $inPeriod(Booking::where('status', 'confirmed'))->count();
        $cancelledBookings = $inPeriod(Booking::where('status', 'cancelled'))->count();
        $pendingBookings = $inPeriod(Booking::where('status', 'pending'))->count();
        $newBookings = Booking::where('created_at', '>=', $startDate)->count();
        // Réservations modifiées (updated_at > created_at avec écart significatif)
        $modifiedBookings = $inPeriod(Booking::whereRaw('updated_at > DATE_ADD(created_at, INTERVAL 1 MINUTE)'))->count();

        // Comptabilité : commissions et reversements
        $commissionsDue = (float) $inPeriod(Commission::where('status', 'pending'))->sum('host_amount');
        $commissionsReversed = (float) $inPeriod(Commission::where('status', 'paid'))->sum('host_amount');
        $platformCommissionsTotal = (float) $inPeriod(Commission::query())->sum('commission_amount');
        $platformCommissionsPending = (float) $inPeriod(Commission::where('status', 'pending'))->sum('commission_amount');
        $platformCommissionsPaid = (float) $inPeriod(Commission::where('status', 'paid'))->sum('commission_amount');

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
        $totalRevenueAllTime = $inPeriod(Payment::where('status', 'completed'))->sum('amount');
        $revenueToday = (float) Payment::where('status', 'completed')
            ->whereDate('created_at', $refDate->toDateString())
            ->sum('amount');
        $revenueThisMonth = (float) Payment::where('status', 'completed')
            ->whereMonth('created_at', $refDate->month)
            ->whereYear('created_at', $refDate->year)
            ->sum('amount');
        $revenueThisYear = (float) Payment::where('status', 'completed')
            ->whereYear('created_at', $refDate->year)
            ->sum('amount');

        // Inspections
        $totalInspections = $inPeriod(Inspection::query())->count();
        $completedInspections = $inPeriod(Inspection::where('status', 'completed'))->count();
        $approvedInspections = $inPeriod(Inspection::where('result', 'approved'))->count();
        $rejectedInspections = $inPeriod(Inspection::where('result', 'rejected'))->count();

        // KPI : RevPAR, taux d'occupation, prix moyen — sur la période filtrée,
        // ou les 30 derniers jours par défaut.
        if ($hasPeriod) {
            $kpiDays = max(1, (int) round($startDate->diffInDays($endDate)));
            $kpiStart = $startDate->copy();
            $kpiEnd = $endDate->copy();
        } else {
            $kpiDays = 30;
            $kpiStart = Carbon::now()->subDays($kpiDays)->startOfDay();
            $kpiEnd = Carbon::now()->endOfDay();
        }
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

        // Retour client 2026-09-16 : "Utilisateur devient Clients" — nombre
        // d'utilisateurs dont le PREMIER paiement complété tombe ce jour-là
        // (conversion inscrit → client payant), pas juste "paiements reçus ce
        // jour" (déjà couvert par `revenue`) qui compterait aussi les clients
        // déjà convertis auparavant. Une seule requête groupée hors de la
        // boucle par jour plutôt qu'une requête par jour.
        $firstPaymentByDay = Payment::where('status', 'completed')
            ->whereNotNull('paid_at')
            ->select('user_id', DB::raw('MIN(paid_at) as first_paid_at'))
            ->groupBy('user_id')
            ->get()
            ->groupBy(fn ($p) => Carbon::parse($p->first_paid_at)->format('Y-m-d'))
            ->map(fn ($group) => $group->count());

        // Parcourir chaque jour
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            $dayStart = $currentDate->copy()->startOfDay();
            $dayEnd = $currentDate->copy()->endOfDay();
            $dayKey = $currentDate->format('Y-m-d');

            $data[] = [
                'date' => $dayKey,
                'users' => User::whereBetween('created_at', [$dayStart, $dayEnd])->count(),
                'bookings' => Booking::whereBetween('created_at', [$dayStart, $dayEnd])->count(),
                'accommodations' => Accommodation::whereBetween('created_at', [$dayStart, $dayEnd])->count(),
                'revenue' => Payment::where('status', 'completed')
                    ->whereBetween('created_at', [$dayStart, $dayEnd])
                    ->sum('amount'),
                'users_converted' => $firstPaymentByDay->get($dayKey, 0),
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

        // Retour client 2026-09-18 : les réservations comptées suivent la période filtrée.
        $hasPeriod = $request->has('from_date') && $request->has('to_date');
        $from = $hasPeriod ? Carbon::parse($request->from_date)->startOfDay() : null;
        $to = $hasPeriod ? Carbon::parse($request->to_date)->endOfDay() : null;

        $hosts = User::where('role', 'host')
            ->withCount([
                'accommodations',
                'bookings' => function ($q) use ($hasPeriod, $from, $to) {
                    if ($hasPeriod) {
                        $q->whereBetween('bookings.created_at', [$from, $to]);
                    }
                },
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
    public function accommodationStatusDistribution(Request $request)
    {
        $query = Accommodation::select('status', DB::raw('count(*) as count'));
        if ($request->has('from_date') && $request->has('to_date')) {
            $query->whereBetween('created_at', [
                Carbon::parse($request->from_date)->startOfDay(),
                Carbon::parse($request->to_date)->endOfDay(),
            ]);
        }
        $distribution = $query
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
    public function bookingsByRegion(Request $request)
    {
        // Retour client 2026-09-18 : filtre de période absent jusqu'ici sur le
        // tableau de bord (page d'accueil admin) — ajouté en cohérence avec
        // dailyActivity(), qui le supportait déjà.
        $query = Booking::join('accommodations', 'bookings.accommodation_id', '=', 'accommodations.id')
            ->where('bookings.status', 'confirmed');

        if ($request->filled('from_date')) {
            $query->where('bookings.created_at', '>=', Carbon::parse($request->from_date)->startOfDay());
        }
        if ($request->filled('to_date')) {
            $query->where('bookings.created_at', '<=', Carbon::parse($request->to_date)->endOfDay());
        }

        $data = $query
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

        // Retour client 2026-09-18 : même filtre de période que
        // bookingsByRegion()/dailyActivity() — absent jusqu'ici.
        $scopeBookings = function ($q) use ($request) {
            $q->where('status', 'confirmed');
            if ($request->filled('from_date')) {
                $q->where('created_at', '>=', Carbon::parse($request->from_date)->startOfDay());
            }
            if ($request->filled('to_date')) {
                $q->where('created_at', '<=', Carbon::parse($request->to_date)->endOfDay());
            }
        };

        $data = Accommodation::withCount(['bookings' => $scopeBookings])
            ->withSum(['bookings' => $scopeBookings], 'total_price')
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
     * Fenêtre des graphiques mensuels : la période filtrée (from_date/to_date,
     * retour client 2026-09-18) — au moins 1 mois, au plus 24 —, sinon les 12
     * derniers mois. Retourne [début de fenêtre, fin de fenêtre, nombre de mois].
     */
    private function monthlyWindow(Request $request): array
    {
        if ($request->has('from_date') && $request->has('to_date')) {
            $from = Carbon::parse($request->from_date)->startOfDay();
            $to = Carbon::parse($request->to_date)->endOfDay();
            $firstMonth = $from->copy()->startOfMonth();
            $months = min(24, max(1, $firstMonth->diffInMonths($to->copy()->startOfMonth()) + 1));
            return [$from, $to, $months, $firstMonth];
        }
        $firstMonth = Carbon::now()->subMonths(11)->startOfMonth();
        return [$firstMonth->copy(), Carbon::now()->endOfDay(), 12, $firstMonth];
    }

    /**
     * Évolution du chiffre d'affaires et des commissions (période filtrée, sinon 12 derniers mois).
     */
    public function monthlyRevenueTrend(Request $request)
    {
        [$startDate, $endDate, $months, $firstMonth] = $this->monthlyWindow($request);

        $revenueByMonth = Payment::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('SUM(amount) as revenue'))
            ->groupBy('month')
            ->pluck('revenue', 'month');

        $commissionsByMonth = Commission::whereBetween('created_at', [$startDate, $endDate])
            ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('SUM(commission_amount) as commissions'))
            ->groupBy('month')
            ->pluck('commissions', 'month');

        $data = [];
        $cursor = $firstMonth->copy();
        for ($i = 0; $i < $months; $i++) {
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
     * Tendance du taux d'occupation moyen (période filtrée, sinon 12 derniers mois ; tous établissements publiés).
     */
    public function occupancyTrend(Request $request)
    {
        [, , $months, $firstMonth] = $this->monthlyWindow($request);
        $totalRooms = (int) DB::table('rooms')
            ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
            ->where('accommodations.status', 'published')
            ->count();

        $data = [];
        $cursor = $firstMonth->copy();
        for ($i = 0; $i < $months; $i++) {
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

