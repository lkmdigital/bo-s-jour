<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    /**
     * Liste des établissements favoris de l'utilisateur (format compact pour les cartes).
     */
    public function index(Request $request)
    {
        $accommodations = $request->user()
            ->favoriteAccommodations()
            ->with('images')
            ->orderByDesc('favorites.created_at')
            ->get()
            ->map(function ($a) {
                $primary = $a->images->firstWhere('is_primary', true) ?? $a->images->first();

                return [
                    'id'              => $a->id,
                    'name'            => $a->name,
                    'city'            => $a->city,
                    'price_per_night' => $a->price_per_night,
                    'rating'          => $a->rating,
                    'total_reviews'   => $a->total_reviews,
                    'image'           => $primary?->url,
                    'status'          => $a->status,
                ];
            });

        return response()->json(['data' => $accommodations]);
    }

    /**
     * Identifiants des établissements favoris (pour l'état des cœurs côté front).
     */
    public function ids(Request $request)
    {
        return response()->json([
            'ids' => $request->user()->favorites()->pluck('accommodation_id'),
        ]);
    }

    /**
     * Ajouter un établissement aux favoris (idempotent).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'accommodation_id' => 'required|integer|exists:accommodations,id',
        ]);

        $favorite = Favorite::firstOrCreate([
            'user_id'          => $request->user()->id,
            'accommodation_id' => $data['accommodation_id'],
        ]);

        return response()->json(
            ['favorited' => true],
            $favorite->wasRecentlyCreated ? 201 : 200
        );
    }

    /**
     * Retirer un établissement des favoris.
     */
    public function destroy(Request $request, int $accommodationId)
    {
        Favorite::where('user_id', $request->user()->id)
            ->where('accommodation_id', $accommodationId)
            ->delete();

        return response()->json(['favorited' => false]);
    }
}
