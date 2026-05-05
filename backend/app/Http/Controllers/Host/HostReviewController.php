<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Accommodation;
use Illuminate\Http\Request;

class HostReviewController extends Controller
{
    /**
     * Liste des avis reçus sur les établissements de l'hôte.
     */
    public function index(Request $request)
    {
        $hostId = $request->user()->id;
        $accommodationIds = Accommodation::where('host_id', $hostId)->pluck('id');

        $reviews = Review::with(['user:id,name', 'accommodation:id,name,city'])
            ->whereIn('accommodation_id', $accommodationIds)
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json($reviews);
    }

    /**
     * Répondre à un avis (réservé à l'hôte propriétaire de l'établissement).
     */
    public function reply(Request $request, int $id)
    {
        $request->validate([
            'host_reply' => 'required|string|max:2000',
        ]);

        $review = Review::findOrFail($id);
        $accommodation = Accommodation::where('id', $review->accommodation_id)->where('host_id', $request->user()->id)->firstOrFail();

        $review->host_reply = $request->host_reply;
        $review->host_replied_at = now();
        $review->save();

        $review->load(['user:id,name', 'accommodation:id,name,city']);
        return response()->json($review);
    }
}
