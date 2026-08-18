<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Base touristique — Portée assumée : cartographie interactive des
 * établissements de la plateforme (géolocalisation déjà présente sur
 * Accommodation) et statistiques agrégées PROPRES À BO SÉJOUR (pas de
 * statistiques nationales officielles du tourisme ivoirien — aucune source
 * de données gouvernementale n'est connectée à la plateforme, on ne fabrique
 * pas ce chiffre).
 */
class AdminTourismController extends Controller
{
    /**
     * Établissements géolocalisés pour la carte.
     */
    public function map(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $accommodations = Accommodation::where('status', 'published')
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get(['id', 'name', 'city', 'type', 'latitude', 'longitude', 'rating', 'total_reviews', 'price_per_night', 'is_featured'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'city' => $a->city,
                'type' => $a->type,
                'lat' => (float) $a->latitude,
                'lng' => (float) $a->longitude,
                'rating' => $a->rating !== null ? (float) $a->rating : null,
                'total_reviews' => $a->total_reviews,
                'price_per_night' => (float) $a->price_per_night,
                'is_featured' => (bool) $a->is_featured,
            ]);

        return response()->json(['data' => $accommodations]);
    }

    /**
     * Statistiques agrégées de la plateforme, par ville et par type
     * d'établissement.
     */
    public function stats(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $byCity = Accommodation::where('status', 'published')
            ->select(
                'city',
                DB::raw('COUNT(*) as accommodations_count'),
                DB::raw('AVG(rating) as avg_rating'),
                DB::raw('AVG(price_per_night) as avg_price'),
                DB::raw('SUM(total_reviews) as total_reviews')
            )
            ->groupBy('city')
            ->orderByDesc('accommodations_count')
            ->get()
            ->map(fn ($row) => [
                'city' => $row->city,
                'accommodations_count' => (int) $row->accommodations_count,
                'avg_rating' => $row->avg_rating !== null ? round((float) $row->avg_rating, 2) : null,
                'avg_price' => round((float) $row->avg_price, 0),
                'total_reviews' => (int) $row->total_reviews,
            ]);

        $byType = Accommodation::where('status', 'published')
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['type' => $row->type, 'count' => (int) $row->count]);

        $bookingsByCity = Booking::join('accommodations', 'bookings.accommodation_id', '=', 'accommodations.id')
            ->where('bookings.status', 'confirmed')
            ->select('accommodations.city', DB::raw('COUNT(*) as bookings_count'), DB::raw('SUM(bookings.total_price) as revenue'))
            ->groupBy('accommodations.city')
            ->pluck('bookings_count', 'accommodations.city');

        $byCity = $byCity->map(function ($row) use ($bookingsByCity) {
            $row['bookings_count'] = (int) ($bookingsByCity[$row['city']] ?? 0);
            return $row;
        });

        $totalPublished = Accommodation::where('status', 'published')->count();
        $totalCities = Accommodation::where('status', 'published')->distinct('city')->count('city');
        $platformAvgRating = Accommodation::where('status', 'published')->whereNotNull('rating')->avg('rating');
        $totalConfirmedBookings = Booking::where('status', 'confirmed')->count();
        $topCity = $byCity->first();

        return response()->json([
            'summary' => [
                'total_published' => $totalPublished,
                'total_cities' => $totalCities,
                'platform_avg_rating' => $platformAvgRating !== null ? round((float) $platformAvgRating, 2) : null,
                'total_confirmed_bookings' => $totalConfirmedBookings,
                'top_city' => $topCity['city'] ?? null,
            ],
            'by_city' => $byCity->values(),
            'by_type' => $byType->values(),
        ]);
    }
}
