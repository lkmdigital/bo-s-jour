<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Accommodation;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Commission;
use App\Models\Promotion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function hostDashboard(Request $request)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $hostId = $request->user()->id;

        $filterByPeriod = $request->has('from_date') && $request->has('to_date');
        $startDate = $filterByPeriod ? Carbon::parse($request->from_date)->startOfDay() : null;
        $endDate = $filterByPeriod ? Carbon::parse($request->to_date)->endOfDay() : null;

        // Total bookings
        $totalBookings = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })->count();

        // Confirmed bookings
        $confirmedBookings = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })->where('status', 'confirmed')->count();

        // Total revenue (filtré par période si from_date/to_date fournis)
        $totalRevenue = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })->where('status', 'confirmed');
        if ($filterByPeriod) {
            $totalRevenue = $totalRevenue->whereBetween('created_at', [$startDate, $endDate]);
        }
        $totalRevenue = $totalRevenue->sum('total_price');

        // Monthly revenue (période filtrée ou 12 derniers mois)
        $monthlyRevenueQuery = Booking::whereHas('accommodation', function($q) use ($hostId) {
                $q->where('host_id', $hostId);
            })
            ->whereIn('status', ['confirmed', 'pending']);
        if ($filterByPeriod) {
            $monthlyRevenueQuery = $monthlyRevenueQuery->whereBetween('created_at', [$startDate, $endDate]);
        } else {
            $monthlyRevenueQuery = $monthlyRevenueQuery->where('created_at', '>=', Carbon::now()->subMonths(11)->startOfMonth());
        }
        $monthlyRevenue = $monthlyRevenueQuery
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('SUM(total_price) as revenue')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Occupancy rate (last 30 days)
        $totalNights = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->where('check_in', '>=', Carbon::now()->subDays(30))
        ->get()
        ->sum(function($booking) {
            return Carbon::parse($booking->check_in)->diffInDays(Carbon::parse($booking->check_out));
        });

        $totalRooms = Accommodation::where('host_id', $hostId)
            ->withCount('rooms')
            ->get()
            ->sum('rooms_count');

        $availableNights = $totalRooms * 30;
        $occupancyRate = $availableNights > 0 ? ($totalNights / $availableNights) * 100 : 0;

        // Top performing accommodations
        $topAccommodations = Accommodation::where('host_id', $hostId)
            ->withCount(['bookings' => function($q) {
                $q->where('status', 'confirmed');
            }])
            ->withSum(['bookings' => function($q) {
                $q->where('status', 'confirmed');
            }], 'total_price')
            ->orderBy('bookings_sum_total_price', 'desc')
            ->limit(5)
            ->get();

        // Average rating trend
        $ratingTrend = Accommodation::where('host_id', $hostId)
            ->select('rating', 'created_at')
            ->orderBy('created_at')
            ->get();

        // Accommodation status statistics
        $totalAccommodations = Accommodation::where('host_id', $hostId)->count();
        $publishedAccommodations = Accommodation::where('host_id', $hostId)
            ->where('status', 'published')
            ->count();
        $pendingAccommodations = Accommodation::where('host_id', $hostId)
            ->where('status', 'pending')
            ->count();
        $rejectedAccommodations = Accommodation::where('host_id', $hostId)
            ->where('status', 'rejected')
            ->count();

        // Room statistics (avec protection contre les tables manquantes)
        $roomStats = null;
        try {
            // Vérifier si la table room_images existe
            $tableExists = DB::select("SHOW TABLES LIKE 'room_images'");
            
            if (!empty($tableExists)) {
                $totalRoomsCount = DB::table('rooms')
                    ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
                    ->where('accommodations.host_id', $hostId)
                    ->count();

                $activeRoomsCount = DB::table('rooms')
                    ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
                    ->where('accommodations.host_id', $hostId)
                    ->where('rooms.is_active', true)
                    ->count();

                $inactiveRoomsCount = $totalRoomsCount - $activeRoomsCount;

                // Rooms without minimum images (need attention)
                $roomsNeedingImages = DB::table('rooms')
                    ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
                    ->leftJoin(DB::raw('(SELECT room_id, COUNT(*) as image_count FROM room_images GROUP BY room_id) as image_counts'), 
                        'rooms.id', '=', 'image_counts.room_id')
                    ->where('accommodations.host_id', $hostId)
                    ->where(function($q) {
                        $q->whereNull('image_counts.image_count')
                          ->orWhere('image_counts.image_count', '<', 3);
                    })
                    ->count();

                // Average images per room
                $avgImagesPerRoom = DB::table('rooms')
                    ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
                    ->leftJoin('room_images', 'rooms.id', '=', 'room_images.room_id')
                    ->where('accommodations.host_id', $hostId)
                    ->select(DB::raw('COUNT(room_images.id) / NULLIF(COUNT(DISTINCT rooms.id), 0) as avg_images'))
                    ->value('avg_images') ?? 0;

                // Room occupancy statistics
                $roomBookings = DB::table('bookings')
                    ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
                    ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
                    ->where('accommodations.host_id', $hostId)
                    ->where('bookings.status', 'confirmed')
                    ->where('bookings.check_in', '>=', Carbon::now()->subDays(30))
                    ->count();

                $roomStats = [
                    'total_rooms' => $totalRoomsCount,
                    'active_rooms' => $activeRoomsCount,
                    'inactive_rooms' => $inactiveRoomsCount,
                    'rooms_needing_images' => $roomsNeedingImages,
                    'avg_images_per_room' => round($avgImagesPerRoom, 1),
                    'room_bookings_last_30_days' => $roomBookings,
                ];
            }
        } catch (\Exception $e) {
            // Si erreur avec les tables room, ignorer et continuer
            \Log::warning('Error fetching room stats: ' . $e->getMessage());
            $roomStats = null;
        }

        // Upcoming bookings (next 30 days)
        $upcomingBookings = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->where('check_in', '>=', Carbon::now())
        ->where('check_in', '<=', Carbon::now()->addDays(30))
        ->count();

        // Pending bookings (awaiting confirmation)
        $pendingBookings = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'pending')
        ->count();

        // Réservations modifiées (hôte)
        $modifiedBookingsHost = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })->whereRaw('updated_at > DATE_ADD(created_at, INTERVAL 1 MINUTE)')->count();

        // Comptabilité hôte : montants dus et déjà reversés
        $hostCommissionsDue = (float) Commission::where('host_id', $hostId)->where('status', 'pending')->sum('host_amount');
        $hostCommissionsReversed = (float) Commission::where('host_id', $hostId)->where('status', 'paid')->sum('host_amount');

        // Promotions actives (hébergements de l'hôte)
        $today = Carbon::today();
        $activePromotionsHost = Promotion::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })->where('is_active', true)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->count();

        // Revenue this month (ou période si filtre actif)
        $revenueThisMonth = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->whereMonth('created_at', Carbon::now()->month)
        ->whereYear('created_at', Carbon::now()->year)
        ->sum('total_price');

        // Revenue last month
        $revenueLastMonth = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->whereMonth('created_at', Carbon::now()->subMonth()->month)
        ->whereYear('created_at', Carbon::now()->subMonth()->year)
        ->sum('total_price');

        $revenueGrowth = $revenueLastMonth > 0 
            ? (($revenueThisMonth - $revenueLastMonth) / $revenueLastMonth) * 100 
            : 0;

        if ($filterByPeriod) {
            $revenueThisMonth = $totalRevenue;
            $revenueLastMonth = 0;
            $revenueGrowth = 0;
        }

        // Daily revenue (today) — 0 si filtre par période
        $dailyRevenue = $filterByPeriod ? 0 : Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->whereDate('created_at', Carbon::today())
        ->sum('total_price');

        // Weekly revenue (last 7 days) — 0 si filtre par période
        $weeklyRevenue = $filterByPeriod ? 0 : Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->where('created_at', '>=', Carbon::now()->subDays(7))
        ->sum('total_price');

        // Monthly revenue (current month) — période si filtre actif
        $monthlyRevenueCurrent = $filterByPeriod ? $totalRevenue : Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })
        ->where('status', 'confirmed')
        ->whereMonth('created_at', Carbon::now()->month)
        ->whereYear('created_at', Carbon::now()->year)
        ->sum('total_price');

        // Statistics per accommodation (avec revenus période si filtre)
        $accommodationsStatsQuery = Accommodation::where('host_id', $hostId)
            ->withCount(['bookings' => function($q) {
                $q->where('status', 'confirmed');
            }])
            ->withSum(['bookings' => function($q) {
                $q->where('status', 'confirmed');
            }], 'total_price')
            ->withCount(['bookings as daily_bookings' => function($q) {
                $q->where('status', 'confirmed')
                  ->whereDate('created_at', Carbon::today());
            }])
            ->withSum(['bookings as daily_revenue' => function($q) {
                $q->where('status', 'confirmed')
                  ->whereDate('created_at', Carbon::today());
            }], 'total_price')
            ->withCount(['bookings as weekly_bookings' => function($q) {
                $q->where('status', 'confirmed')
                  ->where('created_at', '>=', Carbon::now()->subDays(7));
            }])
            ->withSum(['bookings as weekly_revenue' => function($q) {
                $q->where('status', 'confirmed')
                  ->where('created_at', '>=', Carbon::now()->subDays(7));
            }], 'total_price')
            ->withCount(['bookings as monthly_bookings' => function($q) {
                $q->where('status', 'confirmed')
                  ->whereMonth('created_at', Carbon::now()->month)
                  ->whereYear('created_at', Carbon::now()->year);
            }])
            ->withSum(['bookings as monthly_revenue' => function($q) {
                $q->where('status', 'confirmed')
                  ->whereMonth('created_at', Carbon::now()->month)
                  ->whereYear('created_at', Carbon::now()->year);
            }], 'total_price');

        if ($filterByPeriod) {
            $accommodationsStatsQuery = $accommodationsStatsQuery
                ->withCount(['bookings as period_bookings' => function($q) use ($startDate, $endDate) {
                    $q->where('status', 'confirmed')->whereBetween('created_at', [$startDate, $endDate]);
                }])
                ->withSum(['bookings as period_revenue' => function($q) use ($startDate, $endDate) {
                    $q->where('status', 'confirmed')->whereBetween('created_at', [$startDate, $endDate]);
                }], 'total_price');
        }

        $accommodationsStats = $accommodationsStatsQuery->get()
            ->map(function($accommodation) use ($filterByPeriod) {
                $row = [
                    'id' => $accommodation->id,
                    'name' => $accommodation->name,
                    'city' => $accommodation->city,
                    'type' => $accommodation->type,
                    'status' => $accommodation->status,
                    'total_bookings' => $accommodation->bookings_count ?? 0,
                    'total_revenue' => (float) ($accommodation->bookings_sum_total_price ?? 0),
                    'daily_bookings' => $accommodation->daily_bookings ?? 0,
                    'daily_revenue' => (float) ($accommodation->daily_revenue ?? 0),
                    'weekly_bookings' => $accommodation->weekly_bookings ?? 0,
                    'weekly_revenue' => (float) ($accommodation->weekly_revenue ?? 0),
                    'monthly_bookings' => $accommodation->monthly_bookings ?? 0,
                    'monthly_revenue' => (float) ($accommodation->monthly_revenue ?? 0),
                ];
                if ($filterByPeriod) {
                    $row['period_bookings'] = $accommodation->period_bookings ?? 0;
                    $row['period_revenue'] = (float) ($accommodation->period_revenue ?? 0);
                }
                return $row;
            });

        // KPI hôte : RevPAR, prix moyen (sur les 30 derniers jours)
        $kpiDays = 30;
        $kpiStartHost = Carbon::now()->subDays($kpiDays)->startOfDay();
        $bookingsKpiHost = Booking::whereHas('accommodation', function($q) use ($hostId) {
            $q->where('host_id', $hostId);
        })->where('status', 'confirmed')
            ->where('check_out', '>=', $kpiStartHost)
            ->where('check_in', '<=', Carbon::now())
            ->get();
        $roomNightsSoldHost = $bookingsKpiHost->sum(function ($b) use ($kpiStartHost) {
            return Carbon::parse($b->check_in)->diffInDays(Carbon::parse($b->check_out));
        });
        $revenueKpiHost = (float) $bookingsKpiHost->sum('total_price');
        $availableNightsHost = $totalRooms * $kpiDays;
        $revparHost = $availableNightsHost > 0 ? round($revenueKpiHost / $availableNightsHost, 2) : 0;
        $avgPricePerRoomHost = $roomNightsSoldHost > 0 ? round($revenueKpiHost / $roomNightsSoldHost, 2) : 0;

        return response()->json([
            'total_bookings' => $totalBookings,
            'confirmed_bookings' => $confirmedBookings,
            'pending_bookings' => $pendingBookings,
            'upcoming_bookings' => $upcomingBookings,
            'total_revenue' => $totalRevenue,
            'revenue_this_month' => $revenueThisMonth,
            'revenue_last_month' => $revenueLastMonth,
            'revenue_growth' => round($revenueGrowth, 2),
            'daily_revenue' => $dailyRevenue,
            'weekly_revenue' => $weeklyRevenue,
            'monthly_revenue' => $monthlyRevenue,
            'monthly_revenue_current' => $monthlyRevenueCurrent,
            'occupancy_rate' => round($occupancyRate, 2),
            'top_accommodations' => $topAccommodations,
            'accommodations_stats' => $accommodationsStats,
            'rating_trend' => $ratingTrend,
            'accommodations' => [
                'total' => $totalAccommodations,
                'published' => $publishedAccommodations,
                'pending' => $pendingAccommodations,
                'rejected' => $rejectedAccommodations,
            ],
            'room_stats' => $roomStats,
            'reservations' => [
                'total' => $totalBookings,
                'modified' => $modifiedBookingsHost,
                'pending' => $pendingBookings,
            ],
            'accounting' => [
                'commissions_due' => $hostCommissionsDue,
                'commissions_reversed' => $hostCommissionsReversed,
            ],
            'promotions' => [
                'active_count' => $activePromotionsHost,
            ],
            'kpis' => [
                'revpar' => $revparHost,
                'total_revenue' => $totalRevenue,
                'occupancy_rate' => round($occupancyRate, 2),
                'average_price_per_room' => $avgPricePerRoomHost,
                'room_nights_sold' => $roomNightsSoldHost,
                'period_days' => $kpiDays,
            ],
        ]);
    }

    public function adminDashboard(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Room statistics for admin (avec protection contre les tables manquantes)
        $roomStatsAdmin = null;
        try {
            // Vérifier si la table room_images existe
            $tableExists = DB::select("SHOW TABLES LIKE 'room_images'");
            
            if (!empty($tableExists)) {
                $totalRoomsAdmin = DB::table('rooms')->count();
                $activeRoomsAdmin = DB::table('rooms')->where('is_active', true)->count();
                $inactiveRoomsAdmin = $totalRoomsAdmin - $activeRoomsAdmin;
                
                $roomsNeedingImagesAdmin = DB::table('rooms')
                    ->leftJoin(DB::raw('(SELECT room_id, COUNT(*) as image_count FROM room_images GROUP BY room_id) as image_counts'), 
                        'rooms.id', '=', 'image_counts.room_id')
                    ->where(function($q) {
                        $q->whereNull('image_counts.image_count')
                          ->orWhere('image_counts.image_count', '<', 3);
                    })
                    ->count();
                
                $avgImagesPerRoomAdmin = DB::table('rooms')
                    ->leftJoin('room_images', 'rooms.id', '=', 'room_images.room_id')
                    ->select(DB::raw('COUNT(room_images.id) / NULLIF(COUNT(DISTINCT rooms.id), 0) as avg_images'))
                    ->value('avg_images') ?? 0;

                $totalRoomImages = DB::table('room_images')->count();

                $roomStatsAdmin = [
                    'total_rooms' => $totalRoomsAdmin,
                    'active_rooms' => $activeRoomsAdmin,
                    'inactive_rooms' => $inactiveRoomsAdmin,
                    'rooms_needing_images' => $roomsNeedingImagesAdmin,
                    'avg_images_per_room' => round($avgImagesPerRoomAdmin, 1),
                    'total_room_images' => $totalRoomImages,
                ];
            }
        } catch (\Exception $e) {
            // Si erreur avec les tables room, ignorer et continuer
            \Log::warning('Error fetching admin room stats: ' . $e->getMessage());
            $roomStatsAdmin = null;
        }

        $stats = [
            'total_users' => User::count(),
            'total_hosts' => User::where('role', 'host')->count(),
            'total_accommodations' => Accommodation::count(),
            'published_accommodations' => Accommodation::where('status', 'published')->count(),
            'total_bookings' => Booking::count(),
            'confirmed_bookings' => Booking::where('status', 'confirmed')->count(),
            'total_revenue' => Booking::where('status', 'confirmed')->sum('total_price'),
            'subscription_revenue' => Subscription::where('status', 'active')->sum('amount_paid'),
            'active_subscriptions' => Subscription::where('status', 'active')
                ->where('expires_at', '>=', Carbon::now())
                ->count(),
            'room_stats' => $roomStatsAdmin,
        ];

        // Active cities
        $cities = Accommodation::select('city', DB::raw('count(*) as count'))
            ->where('status', 'published')
            ->groupBy('city')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get();

        // Monthly bookings trend
        $monthlyBookings = Booking::where('created_at', '>=', Carbon::now()->subMonths(6))
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'stats' => $stats,
            'cities' => $cities,
            'monthly_bookings' => $monthlyBookings,
        ]);
    }

    public function travelerDashboard(Request $request)
    {
        if (!$request->user()->isUser()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $userId = $request->user()->id;

        $bookings = Booking::where('user_id', $userId)
            ->with(['accommodation.images', 'room'])
            ->orderBy('created_at', 'desc')
            ->get();

        $upcomingBookings = $bookings->filter(function($booking) {
            return $booking->check_in >= Carbon::now() && $booking->status === 'confirmed';
        })->values();

        $pastBookings = $bookings->filter(function($booking) {
            return $booking->check_out < Carbon::now() && $booking->status === 'confirmed';
        })->values();

        // Top rated accommodations (for recommendations)
        $topRated = Accommodation::published()
            ->where('rating', '>=', 4)
            ->orderBy('rating', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'total_bookings' => $bookings->count(),
            'upcoming_bookings' => $upcomingBookings,
            'past_bookings' => $pastBookings,
            'recommendations' => $topRated,
        ]);
    }

    public function accommodationStats(Request $request, $accommodationId)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $hostId = $request->user()->id;

        // Vérifier que l'établissement appartient à l'hôte
        $accommodation = Accommodation::where('id', $accommodationId)
            ->where('host_id', $hostId)
            ->firstOrFail();

        // Total bookings
        $totalBookings = Booking::where('accommodation_id', $accommodationId)->count();
        $confirmedBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->count();
        $pendingBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'pending')
            ->count();

        // Total revenue
        $totalRevenue = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->sum('total_price');

        // Daily revenue (today)
        $dailyRevenue = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->whereDate('created_at', Carbon::today())
            ->sum('total_price');
        $dailyBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->whereDate('created_at', Carbon::today())
            ->count();

        // Weekly revenue (last 7 days)
        $weeklyRevenue = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->sum('total_price');
        $weeklyBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->count();

        // Monthly revenue (current month)
        $monthlyRevenue = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->sum('total_price');
        $monthlyBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->whereMonth('created_at', Carbon::now()->month)
            ->whereYear('created_at', Carbon::now()->year)
            ->count();

        // Revenue last month
        $revenueLastMonth = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->whereMonth('created_at', Carbon::now()->subMonth()->month)
            ->whereYear('created_at', Carbon::now()->subMonth()->year)
            ->sum('total_price');

        $revenueGrowth = $revenueLastMonth > 0 
            ? (($monthlyRevenue - $revenueLastMonth) / $revenueLastMonth) * 100 
            : 0;

        // Monthly revenue trend (last 6 months)
        $monthlyRevenueTrend = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where('created_at', '>=', Carbon::now()->subMonths(6))
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('SUM(total_price) as revenue'),
                DB::raw('COUNT(*) as bookings')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Upcoming bookings (next 30 days)
        $upcomingBookings = Booking::where('accommodation_id', $accommodationId)
            ->where('status', 'confirmed')
            ->where('check_in', '>=', Carbon::now())
            ->where('check_in', '<=', Carbon::now()->addDays(30))
            ->count();

        // Recent bookings (last 10)
        $recentBookings = Booking::where('accommodation_id', $accommodationId)
            ->with(['user:id,name,email', 'room:id,name,type'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($booking) {
                return [
                    'id' => $booking->id,
                    'check_in' => $booking->check_in,
                    'check_out' => $booking->check_out,
                    'guests' => $booking->guests,
                    'total_price' => $booking->total_price,
                    'status' => $booking->status,
                    'created_at' => $booking->created_at,
                    'user' => $booking->user ? [
                        'name' => $booking->user->name,
                        'email' => $booking->user->email,
                    ] : null,
                    'room' => $booking->room ? [
                        'name' => $booking->room->name,
                        'type' => $booking->room->type,
                    ] : null,
                ];
            });

        return response()->json([
            'accommodation' => [
                'id' => $accommodation->id,
                'name' => $accommodation->name,
                'type' => $accommodation->type,
                'city' => $accommodation->city,
                'status' => $accommodation->status,
            ],
            'total_bookings' => $totalBookings,
            'confirmed_bookings' => $confirmedBookings,
            'pending_bookings' => $pendingBookings,
            'upcoming_bookings' => $upcomingBookings,
            'total_revenue' => $totalRevenue,
            'daily_revenue' => $dailyRevenue,
            'daily_bookings' => $dailyBookings,
            'weekly_revenue' => $weeklyRevenue,
            'weekly_bookings' => $weeklyBookings,
            'monthly_revenue' => $monthlyRevenue,
            'monthly_bookings' => $monthlyBookings,
            'revenue_last_month' => $revenueLastMonth,
            'revenue_growth' => round($revenueGrowth, 2),
            'monthly_revenue_trend' => $monthlyRevenueTrend,
            'recent_bookings' => $recentBookings,
        ]);
    }
}
