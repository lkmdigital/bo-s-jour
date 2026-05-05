<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Booking;
use App\Models\Accommodation;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /** Nombre de jours après le séjour pendant lesquels le token est valide */
    public const REVIEW_TOKEN_VALID_DAYS = 90;

    /**
     * Récupérer les infos d'une réservation par token (lien post-séjour, public).
     */
    public function getBookingByToken(string $token)
    {
        $booking = Booking::where('review_token', $token)->first();

        if (!$booking) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 404);
        }

        $checkOut = $booking->check_out ? \Carbon\Carbon::parse($booking->check_out) : null;
        $expiresAt = $checkOut ? $checkOut->addDays(self::REVIEW_TOKEN_VALID_DAYS) : null;
        if ($expiresAt && now()->greaterThan($expiresAt)) {
            return response()->json(['message' => 'Ce lien a expiré.'], 410);
        }

        $existingReview = Review::where('user_id', $booking->user_id)
            ->where('accommodation_id', $booking->accommodation_id)
            ->first();

        if ($existingReview) {
            return response()->json([
                'message' => 'Vous avez déjà laissé un avis pour ce séjour.',
                'already_reviewed' => true,
            ], 200);
        }

        $booking->load(['accommodation:id,name,city', 'room:id,name']);

        return response()->json([
            'booking_id' => $booking->id,
            'accommodation_id' => $booking->accommodation_id,
            'accommodation_name' => $booking->accommodation->name ?? null,
            'accommodation_city' => $booking->accommodation->city ?? null,
            'room_name' => $booking->room->name ?? null,
            'check_in' => $booking->check_in?->format('Y-m-d'),
            'check_out' => $booking->check_out?->format('Y-m-d'),
        ]);
    }

    /**
     * Soumettre un avis via le token (lien post-séjour, public).
     */
    public function submitByToken(Request $request)
    {
        $mainCategories = [
            'cleanliness' => 'Propreté',
            'equipment' => 'Equipements',
            'staff' => 'Personnel',
            'value_for_money' => 'Rapport qualité/prix',
            'location' => 'Situation géographique',
            'comfort' => 'Confort',
        ];
        $additionalCategories = [
            'wifi' => 'Wi-Fi',
            'bed' => 'Evaluation du lit',
            'breakfast' => 'Petit déjeuner',
        ];
        $allCategories = array_merge($mainCategories, $additionalCategories);

        $rules = [
            'token' => 'required|string|size:64',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
            'comment_en' => 'nullable|string|max:1000',
        ];
        foreach (array_keys($mainCategories) as $category) {
            $rules["category_ratings.{$category}"] = 'required|integer|min:1|max:5';
        }
        foreach (array_keys($additionalCategories) as $category) {
            $rules["category_ratings.{$category}"] = 'nullable|integer|min:1|max:5';
        }

        $request->validate($rules);

        $booking = Booking::where('review_token', $request->token)->first();
        if (!$booking) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 404);
        }

        $checkOut = $booking->check_out ? \Carbon\Carbon::parse($booking->check_out) : null;
        $expiresAt = $checkOut ? $checkOut->copy()->addDays(self::REVIEW_TOKEN_VALID_DAYS) : null;
        if ($expiresAt && now()->greaterThan($expiresAt)) {
            return response()->json(['message' => 'Ce lien a expiré.'], 410);
        }

        $existingReview = Review::where('user_id', $booking->user_id)
            ->where('accommodation_id', $booking->accommodation_id)
            ->first();
        if ($existingReview) {
            return response()->json(['message' => 'Vous avez déjà laissé un avis pour ce séjour.'], 400);
        }

        $categoryRatings = [];
        foreach ($allCategories as $key => $label) {
            if ($request->has("category_ratings.{$key}")) {
                $categoryRatings[$key] = (int) $request->input("category_ratings.{$key}");
            }
        }

        $review = Review::create([
            'user_id' => $booking->user_id,
            'accommodation_id' => $booking->accommodation_id,
            'rating' => $request->rating,
            'category_ratings' => $categoryRatings,
            'comment' => $request->comment,
            'comment_en' => $request->comment_en,
        ]);

        $accommodation = Accommodation::findOrFail($booking->accommodation_id);
        $approvedQuery = Review::where('accommodation_id', $booking->accommodation_id)->where('moderation_status', 'approved');
        $accommodation->update([
            'rating' => round((float) $approvedQuery->avg('rating'), 2),
            'total_reviews' => $approvedQuery->count(),
        ]);

        return response()->json([
            'message' => 'Merci pour votre avis !',
            'review' => $review->load('user'),
        ], 201);
    }

    public function index(Request $request, $accommodationId)
    {
        $query = Review::with('user')
            ->where('accommodation_id', $accommodationId)
            ->where('moderation_status', 'approved')
            ->orderBy('created_at', 'desc');

        $reviews = $query->paginate(10);

        return response()->json($reviews);
    }

    public function store(Request $request)
    {
        // Catégories principales
        $mainCategories = [
            'cleanliness' => 'Propreté',
            'equipment' => 'Equipements',
            'staff' => 'Personnel',
            'value_for_money' => 'Rapport qualité/prix',
            'location' => 'Situation géographique',
            'comfort' => 'Confort',
        ];

        // Catégories supplémentaires
        $additionalCategories = [
            'wifi' => 'Wi-Fi',
            'bed' => 'Evaluation du lit',
            'breakfast' => 'Petit déjeuner',
        ];

        $allCategories = array_merge($mainCategories, $additionalCategories);

        $rules = [
            'accommodation_id' => 'required|exists:accommodations,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
            'comment_en' => 'nullable|string|max:1000',
        ];

        // Validation des catégories principales (requises)
        foreach (array_keys($mainCategories) as $category) {
            $rules["category_ratings.{$category}"] = 'required|integer|min:1|max:5';
        }

        // Validation des catégories supplémentaires (optionnelles)
        foreach (array_keys($additionalCategories) as $category) {
            $rules["category_ratings.{$category}"] = 'nullable|integer|min:1|max:5';
        }

        $request->validate($rules);

        // Check if user has a confirmed booking
        $hasBooking = \App\Models\Booking::where('user_id', $request->user()->id)
            ->where('accommodation_id', $request->accommodation_id)
            ->where('status', 'confirmed')
            ->where('check_out', '<=', now())
            ->exists();

        if (!$hasBooking) {
            return response()->json(['message' => 'You must have a completed booking to review'], 400);
        }

        // Check if user already reviewed
        $existingReview = Review::where('user_id', $request->user()->id)
            ->where('accommodation_id', $request->accommodation_id)
            ->first();

        if ($existingReview) {
            return response()->json(['message' => 'You have already reviewed this accommodation'], 400);
        }

        // Préparer les catégories d'évaluation
        $categoryRatings = [];
        foreach ($allCategories as $key => $label) {
            if ($request->has("category_ratings.{$key}")) {
                $categoryRatings[$key] = (int) $request->input("category_ratings.{$key}");
            }
        }

        $review = Review::create([
            'user_id' => $request->user()->id,
            'accommodation_id' => $request->accommodation_id,
            'rating' => $request->rating,
            'category_ratings' => $categoryRatings,
            'comment' => $request->comment,
            'comment_en' => $request->comment_en,
        ]);

        // Update accommodation rating (only approved reviews count)
        $accommodation = Accommodation::findOrFail($request->accommodation_id);
        $approvedQuery = Review::where('accommodation_id', $request->accommodation_id)->where('moderation_status', 'approved');
        $accommodation->update([
            'rating' => round((float) $approvedQuery->avg('rating'), 2),
            'total_reviews' => $approvedQuery->count(),
        ]);

        return response()->json($review->load('user'), 201);
    }

    /**
     * Signaler un avis (utilisateur connecté).
     */
    public function report(Request $request, int $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $review = Review::findOrFail($id);
        $review->increment('report_count');
        $review->update([
            'is_reported' => true,
            'report_reason' => $request->reason ?? $review->report_reason,
            'moderation_status' => 'pending',
        ]);

        return response()->json(['message' => 'Avis signalé. L\'équipe va l\'examiner.']);
    }
}

