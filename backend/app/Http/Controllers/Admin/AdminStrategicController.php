<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Inspection;
use App\Models\Payment;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Tableau stratégique (vue exécutive) — Portée assumée : classements multi-critères,
 * estimation de tendance simple (pas de modèle prédictif), et alertes calculées à
 * partir de signaux déjà présents dans la plateforme. La cartographie interactive
 * complète est laissée à « Base touristique » (même besoin, évite d'installer une
 * lib de cartographie deux fois) ; ici, la répartition géographique reste une
 * table classée par ville (réutilise la même logique que le dashboard principal).
 */
class AdminStrategicController extends Controller
{
    /**
     * Classements multi-critères des établissements — tête ET queue de peloton,
     * contrairement au top 5/10 du tableau de bord principal.
     */
    public function rankings(Request $request)
    {
        $metric = $request->get('metric', 'revenue');
        $limit = (int) $request->get('limit', 10);

        $base = Accommodation::where('status', 'published')
            ->withCount(['bookings' => fn ($q) => $q->where('status', 'confirmed')])
            ->withSum(['bookings' => fn ($q) => $q->where('status', 'confirmed')], 'total_price');

        $orderColumn = match ($metric) {
            'occupancy', 'bookings' => 'bookings_count',
            'rating' => 'rating',
            default => 'bookings_sum_total_price',
        };

        $top = (clone $base)->orderByDesc($orderColumn)->limit($limit)->get();
        $bottom = (clone $base)
            ->having($orderColumn, '>', 0)
            ->orderBy($orderColumn)
            ->limit($limit)
            ->get();

        $present = fn ($a) => [
            'id' => $a->id,
            'name' => $a->name,
            'city' => $a->city,
            'bookings_count' => $a->bookings_count,
            'revenue' => (float) ($a->bookings_sum_total_price ?? 0),
            'rating' => $a->rating !== null ? (float) $a->rating : null,
            'total_reviews' => $a->total_reviews,
        ];

        return response()->json([
            'metric' => $metric,
            'top' => $top->map($present)->values(),
            'bottom' => $bottom->map($present)->values(),
        ]);
    }

    /**
     * Estimation simple de tendance (moyenne mobile + progression linéaire sur les
     * 3 derniers mois) — explicitement PAS un modèle prédictif, juste une
     * extrapolation lisible pour anticiper le mois prochain.
     */
    public function forecast()
    {
        $months = [];
        $cursor = Carbon::now()->subMonths(5)->startOfMonth();
        for ($i = 0; $i < 6; $i++) {
            $monthStart = $cursor->copy()->startOfMonth();
            $monthEnd = $cursor->copy()->endOfMonth();

            $revenue = (float) Payment::where('status', 'completed')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount');

            $bookings = Booking::where('status', 'confirmed')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->count();

            $months[] = ['month' => $monthStart->format('Y-m'), 'revenue' => $revenue, 'bookings' => $bookings];
            $cursor->addMonth();
        }

        $revenueSeries = array_column($months, 'revenue');
        $bookingsSeries = array_column($months, 'bookings');

        $nextMonthLabel = Carbon::now()->addMonth()->startOfMonth()->format('Y-m');

        return response()->json([
            'history' => $months,
            'forecast_next_month' => [
                'month' => $nextMonthLabel,
                'revenue' => $this->linearForecastNext($revenueSeries),
                'bookings' => (int) round($this->linearForecastNext($bookingsSeries)),
            ],
        ]);
    }

    /**
     * Alertes stratégiques : signaux calculés à partir de données déjà en base
     * (conformité, réservations en attente, tendance revenus/occupation, avis
     * signalés, établissements jamais inspectés). Règles simples et transparentes,
     * pas de détection automatique "intelligente".
     */
    public function alerts()
    {
        $alerts = [];

        // Conformité — réutilise l'accessor déjà utilisé par le module Conformité
        $hosts = User::where('role', 'host')->get();
        $nonConformeCount = $hosts->filter(fn ($h) => $h->compliance_status === 'non_conforme')->count();
        if ($nonConformeCount > 0) {
            $alerts[] = [
                'severity' => $nonConformeCount >= 5 ? 'high' : 'medium',
                'category' => 'compliance',
                'message' => "{$nonConformeCount} hôte(s) avec un dossier de conformité incomplet.",
                'link' => '/dashboard/admin/conformite',
            ];
        }

        // Établissements en attente de validation depuis longtemps
        $pendingOld = Accommodation::where('status', 'pending')->where('created_at', '<=', now()->subDays(7))->count();
        if ($pendingOld > 0) {
            $alerts[] = [
                'severity' => 'medium',
                'category' => 'accommodations',
                'message' => "{$pendingOld} établissement(s) en attente de validation depuis plus de 7 jours.",
                'link' => '/dashboard/admin/accommodations?status=pending',
            ];
        }

        // Réservations en attente depuis longtemps
        $pendingBookings = Booking::where('status', 'pending')->where('created_at', '<=', now()->subHours(48))->count();
        if ($pendingBookings > 0) {
            $alerts[] = [
                'severity' => 'medium',
                'category' => 'bookings',
                'message' => "{$pendingBookings} réservation(s) en attente depuis plus de 48h.",
                'link' => '/dashboard/admin/reservations',
            ];
        }

        // Avis signalés en attente de modération
        $pendingReviews = Review::where('moderation_status', 'pending')->count();
        if ($pendingReviews > 0) {
            $alerts[] = [
                'severity' => 'low',
                'category' => 'reviews',
                'message' => "{$pendingReviews} avis signalé(s) en attente de modération.",
                'link' => '/dashboard/admin/reviews',
            ];
        }

        // Établissements publiés n'ayant jamais été inspectés
        $neverInspected = Accommodation::where('status', 'published')
            ->whereDoesntHave('inspections')
            ->count();
        if ($neverInspected > 0) {
            $alerts[] = [
                'severity' => 'low',
                'category' => 'inspections',
                'message' => "{$neverInspected} établissement(s) publié(s) n'ont jamais été inspectés.",
                'link' => '/dashboard/admin/inspections',
            ];
        }

        // Tendance revenus : ce mois vs mois précédent
        $thisMonth = (float) Payment::where('status', 'completed')
            ->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->sum('amount');
        $lastMonth = (float) Payment::where('status', 'completed')
            ->whereMonth('created_at', now()->subMonth()->month)->whereYear('created_at', now()->subMonth()->year)->sum('amount');
        if ($lastMonth > 0) {
            $delta = round((($thisMonth - $lastMonth) / $lastMonth) * 100, 1);
            if ($delta <= -20) {
                $alerts[] = [
                    'severity' => 'high',
                    'category' => 'revenue',
                    'message' => "Chiffre d'affaires en baisse de {$delta}% par rapport au mois précédent (partiel si le mois est en cours).",
                    'link' => '/dashboard/admin/comptabilite',
                ];
            }
        }

        $order = ['high' => 0, 'medium' => 1, 'low' => 2];
        usort($alerts, fn ($a, $b) => $order[$a['severity']] <=> $order[$b['severity']]);

        return response()->json(['data' => $alerts]);
    }

    /**
     * Répartition géographique par ville — mêmes chiffres que le widget
     * "Réservations par région" du tableau de bord principal (réutilisé tel
     * quel, pas dupliqué), présentés ici en table classée pour la vue exécutive.
     */
    public function geography()
    {
        $data = Booking::join('accommodations', 'bookings.accommodation_id', '=', 'accommodations.id')
            ->where('bookings.status', 'confirmed')
            ->select(
                'accommodations.city',
                DB::raw('COUNT(bookings.id) as bookings_count'),
                DB::raw('SUM(bookings.total_price) as revenue'),
                DB::raw('COUNT(DISTINCT accommodations.id) as accommodations_count')
            )
            ->groupBy('accommodations.city')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'city' => $row->city,
                'bookings_count' => (int) $row->bookings_count,
                'revenue' => (float) $row->revenue,
                'accommodations_count' => (int) $row->accommodations_count,
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * Régression linéaire simple (moindres carrés) sur une série, extrapolée au
     * point suivant. Retourne 0 si la série est trop courte ou constante à 0.
     */
    private function linearForecastNext(array $series): float
    {
        $n = count($series);
        if ($n < 2 || array_sum($series) == 0) {
            return $n > 0 ? end($series) : 0;
        }

        $xSum = $ySum = $xySum = $xxSum = 0;
        foreach ($series as $i => $y) {
            $xSum += $i;
            $ySum += $y;
            $xySum += $i * $y;
            $xxSum += $i * $i;
        }

        $denominator = ($n * $xxSum - $xSum * $xSum);
        if ($denominator == 0) {
            return round($ySum / $n, 2);
        }

        $slope = ($n * $xySum - $xSum * $ySum) / $denominator;
        $intercept = ($ySum - $slope * $xSum) / $n;
        $nextX = $n; // point suivant après la série (index 0..n-1)

        return round(max(0, $slope * $nextX + $intercept), 2);
    }
}
