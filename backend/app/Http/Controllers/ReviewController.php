<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\ReviewReaction;
use App\Models\Booking;
use App\Models\Accommodation;
use App\Models\LoyaltyPointsTransaction;
use App\Models\Setting;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /** Nombre de jours après le séjour pendant lesquels le token est valide */
    public const REVIEW_TOKEN_VALID_DAYS = 90;

    /**
     * Mes avis : ceux déjà déposés + les séjours terminés en attente d'avis.
     */
    public function myReviews(Request $request)
    {
        $userId = $request->user()->id;

        $submitted = Review::where('user_id', $userId)
            ->with('accommodation:id,name,city')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id'             => $r->id,
                'rating'         => $r->rating,
                'comment'        => $r->comment,
                'host_reply'     => $r->host_reply,
                'created_at'     => $r->created_at,
                'accommodation'  => $r->accommodation ? ['id' => $r->accommodation->id, 'name' => $r->accommodation->name, 'city' => $r->accommodation->city] : null,
            ]);

        $reviewedAccommodationIds = $submitted->pluck('accommodation.id')->filter()->all();

        $pending = Booking::where('user_id', $userId)
            ->where('status', 'confirmed')
            ->where('check_out', '<=', now())
            ->whereNotIn('accommodation_id', $reviewedAccommodationIds ?: [0])
            ->with('accommodation:id,name,city')
            ->orderByDesc('check_out')
            ->get()
            ->unique('accommodation_id')
            ->map(fn ($b) => [
                'booking_id'    => $b->id,
                'check_out'     => $b->check_out,
                'accommodation' => $b->accommodation ? ['id' => $b->accommodation->id, 'name' => $b->accommodation->name, 'city' => $b->accommodation->city] : null,
            ])
            ->values();

        return response()->json(['submitted' => $submitted->values(), 'pending' => $pending]);
    }

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
        $allCategories = Review::CATEGORIES;

        $rules = [
            'token' => 'required|string|size:64',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
            'comment_en' => 'nullable|string|max:1000',
        ];
        foreach (array_keys($allCategories) as $category) {
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

        $this->refreshAccommodationRating($booking->accommodation_id);
        $this->awardReviewBonus($review);

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

    /**
     * Retour client 2026-09-17 : page publique "Avis clients" listant tous les
     * avis de la plateforme (toutes réservations confondues), pour montrer que
     * la plateforme est utilisée par de vrais voyageurs. Public, en lecture
     * seule ; ne renvoie que les avis approuvés. `with('user:id,name,avatar')`
     * plutôt que la relation complète : jamais les champs sensibles du compte
     * (documents, coordonnées, finances) dans une réponse publique.
     */
    public function all(Request $request)
    {
        $query = Review::with(['user:id,name,avatar', 'accommodation:id,name,city'])
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('type', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('type', 'dislike'),
            ])
            ->where('moderation_status', 'approved')
            ->orderByDesc('created_at');

        $reviews = $query->paginate(10);

        // Retour client 2026-09-18 : réaction de l'utilisateur connecté, pour
        // que le bouton reflète son propre choix (même principe que les avis
        // plateforme).
        if ($request->user()) {
            $myReactions = ReviewReaction::where('user_id', $request->user()->id)
                ->whereIn('review_id', $reviews->pluck('id'))
                ->pluck('type', 'review_id');

            $reviews->getCollection()->each(function ($r) use ($myReactions) {
                $r->my_reaction = $myReactions->get($r->id);
            });
        }

        return response()->json($reviews);
    }

    public function store(Request $request)
    {
        // Critères de notation par catégorie (1-5, tous facultatifs)
        $allCategories = Review::CATEGORIES;

        $rules = [
            'accommodation_id' => 'required|exists:accommodations,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|max:1000',
            'comment_en' => 'nullable|string|max:1000',
        ];

        foreach (array_keys($allCategories) as $category) {
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

        $this->refreshAccommodationRating((int) $request->accommodation_id);
        $this->awardReviewBonus($review);

        return response()->json($review->load('user'), 201);
    }

    /**
     * Signaler un avis (utilisateur connecté). Idempotent par utilisateur : un même
     * voyageur ne peut pas gonfler report_count en signalant plusieurs fois le même
     * avis (ex. après un rechargement de page qui réinitialise l'état du bouton).
     */
    public function report(Request $request, int $id)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $review = Review::findOrFail($id);
        $reportedBy = $review->reported_by ?? [];
        $userId = $request->user()->id;

        if (in_array($userId, $reportedBy, true)) {
            return response()->json(['message' => 'Vous avez déjà signalé cet avis. L\'équipe l\'examine.']);
        }

        $reportedBy[] = $userId;
        $review->update([
            'is_reported' => true,
            'report_reason' => $request->reason ?? $review->report_reason,
            'report_count' => count($reportedBy),
            'reported_by' => $reportedBy,
            'moderation_status' => 'pending',
        ]);

        // moderation_status vient de passer à 'pending' : l'avis ne doit plus
        // compter dans la moyenne tant qu'un admin ne l'a pas re-modéré (sinon la
        // note affichée reste artificiellement gonflée par un avis désormais en attente).
        $this->refreshAccommodationRating($review->accommodation_id);

        return response()->json(['message' => 'Avis signalé. L\'équipe va l\'examiner.']);
    }

    private function refreshAccommodationRating(int $accommodationId): void
    {
        $approved = Review::where('accommodation_id', $accommodationId)->where('moderation_status', 'approved');
        Accommodation::where('id', $accommodationId)->update([
            'rating' => round((float) $approved->avg('rating'), 2),
            'total_reviews' => $approved->count(),
        ]);
    }

    /**
     * Bonus fidélité "avis après séjour" (brief Programme de Fidélité) — un
     * seul bonus par avis, la contrainte "un avis par (user, établissement)"
     * déjà vérifiée plus haut dans les deux points d'entrée suffit comme
     * garde d'idempotence (impossible de laisser deux fois un avis).
     */
    private function awardReviewBonus(Review $review): void
    {
        $bonus = (int) Setting::get('loyalty_review_bonus', 50);
        if ($bonus <= 0) {
            return;
        }

        $user = \App\Models\User::find($review->user_id);
        if (!$user) {
            return;
        }

        app(LoyaltyService::class)->awardPoints(
            $user,
            $bonus,
            LoyaltyPointsTransaction::TYPE_REVIEW_BONUS,
            null,
            'Merci pour votre avis !'
        );
    }

    /**
     * Retour client 2026-09-18 : "on doit pouvoir liker les avis sur les
     * établissements" — j'aime/je n'aime pas, un seul des deux par
     * utilisateur et par avis. Recliquer sur la même réaction la retire ;
     * cliquer sur l'autre la remplace. Même principe que
     * TestimonialController::react().
     */
    public function react(Request $request, int $id)
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Connectez-vous pour réagir à un avis.',
                'requires_auth' => true,
            ], 401);
        }

        $validated = $request->validate([
            'type' => 'required|in:like,dislike',
        ]);

        $review = Review::where('moderation_status', 'approved')->findOrFail($id);
        $userId = $request->user()->id;

        $existing = ReviewReaction::where('review_id', $review->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing && $existing->type === $validated['type']) {
            $existing->delete();
            $myReaction = null;
        } elseif ($existing) {
            $existing->update(['type' => $validated['type']]);
            $myReaction = $validated['type'];
        } else {
            ReviewReaction::create([
                'review_id' => $review->id,
                'user_id' => $userId,
                'type' => $validated['type'],
            ]);
            $myReaction = $validated['type'];
        }

        return response()->json([
            'likes_count' => ReviewReaction::where('review_id', $review->id)->where('type', 'like')->count(),
            'dislikes_count' => ReviewReaction::where('review_id', $review->id)->where('type', 'dislike')->count(),
            'my_reaction' => $myReaction,
        ]);
    }
}

