<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Accommodation;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    /**
     * Liste des avis (admin) avec filtres.
     */
    public function index(Request $request)
    {
        $query = Review::with(['user:id,name,email', 'accommodation:id,name,host_id'])
            ->orderByRaw("CASE moderation_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")
            ->orderByDesc('report_count')
            ->orderByDesc('created_at');

        if ($request->filled('moderation_status')) {
            $query->where('moderation_status', $request->moderation_status);
        }
        if ($request->filled('accommodation_id')) {
            $query->where('accommodation_id', $request->accommodation_id);
        }

        $reviews = $query->paginate($request->get('per_page', 20));

        return response()->json($reviews);
    }

    /**
     * Modérer un avis : approve (visible) ou hide (masqué).
     */
    public function moderate(Request $request, int $id)
    {
        $request->validate([
            'action' => 'required|in:approve,hide',
        ]);

        $review = Review::with('accommodation')->findOrFail($id);
        $review->update([
            'moderation_status' => $request->action === 'approve' ? 'approved' : 'hidden',
            'is_reported' => false,
        ]);

        $this->refreshAccommodationRating($review->accommodation_id);

        return response()->json($review->load(['user:id,name', 'accommodation:id,name']));
    }

    private function refreshAccommodationRating(int $accommodationId): void
    {
        $approved = Review::where('accommodation_id', $accommodationId)->where('moderation_status', 'approved');
        Accommodation::where('id', $accommodationId)->update([
            'rating' => round((float) $approved->avg('rating'), 2),
            'total_reviews' => $approved->count(),
        ]);
    }
}
