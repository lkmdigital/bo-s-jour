<?php

namespace App\Http\Controllers;

use App\Models\PlatformTestimonial;
use App\Models\TestimonialReaction;
use Illuminate\Http\Request;

/**
 * Avis plateforme laissés par de vrais voyageurs depuis le bouton "Laissez
 * un avis sur boséjour" de l'accueil (retour client 2026-09-17) — distinct
 * de ReviewController (avis post-séjour liés à une réservation). Public en
 * lecture (avis publiés uniquement), soumission réservée aux comptes
 * connectés pour éviter l'usurpation d'identité.
 */
class TestimonialController extends Controller
{
    public function index(Request $request)
    {
        $testimonials = PlatformTestimonial::published()
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('type', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('type', 'dislike'),
            ])
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['id', 'first_name', 'avatar_path', 'comment']);

        // Retour client 2026-09-18 : réaction (j'aime / je n'aime pas) de
        // l'utilisateur connecté, pour que le bouton reflète son propre choix.
        if ($request->user()) {
            $myReactions = TestimonialReaction::where('user_id', $request->user()->id)
                ->whereIn('platform_testimonial_id', $testimonials->pluck('id'))
                ->pluck('type', 'platform_testimonial_id');

            $testimonials->each(function ($t) use ($myReactions) {
                $t->my_reaction = $myReactions->get($t->id);
            });
        }

        return response()->json(['data' => $testimonials]);
    }

    /**
     * Mes avis sur boséjour (utilisateur connecté), publiés ou non : l'auteur
     * doit retrouver son avis même tant que l'équipe ne l'a pas validé.
     */
    public function mine(Request $request)
    {
        $items = PlatformTestimonial::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get(['id', 'comment', 'is_published', 'created_at']);

        return response()->json(['data' => $items]);
    }

    public function store(Request $request)
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Connectez-vous pour laisser un avis sur boséjour.',
                'requires_auth' => true,
            ], 401);
        }

        $validated = $request->validate([
            'comment' => 'required|string|min:5|max:500',
        ]);

        $user = $request->user();
        $firstName = $user->first_name ?: trim((string) strtok($user->name ?? '', ' '));
        if ($firstName === '') {
            $firstName = 'Client';
        }

        $testimonial = PlatformTestimonial::create([
            'user_id' => $user->id,
            'first_name' => $firstName,
            'avatar_path' => $user->avatar ?: null,
            'comment' => $validated['comment'],
            'is_published' => false,
        ]);

        return response()->json([
            'data' => $testimonial,
            'message' => 'Merci ! Votre avis sera visible après validation par notre équipe.',
        ], 201);
    }

    /**
     * Retour client 2026-09-18 : "apprécier ou pas" un avis (like/dislike),
     * un seul des deux par utilisateur et par avis. Recliquer sur la même
     * réaction la retire ; cliquer sur l'autre la remplace.
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

        $testimonial = PlatformTestimonial::published()->findOrFail($id);
        $userId = $request->user()->id;

        $existing = TestimonialReaction::where('platform_testimonial_id', $testimonial->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing && $existing->type === $validated['type']) {
            $existing->delete();
            $myReaction = null;
        } elseif ($existing) {
            $existing->update(['type' => $validated['type']]);
            $myReaction = $validated['type'];
        } else {
            TestimonialReaction::create([
                'platform_testimonial_id' => $testimonial->id,
                'user_id' => $userId,
                'type' => $validated['type'],
            ]);
            $myReaction = $validated['type'];
        }

        return response()->json([
            'likes_count' => TestimonialReaction::where('platform_testimonial_id', $testimonial->id)->where('type', 'like')->count(),
            'dislikes_count' => TestimonialReaction::where('platform_testimonial_id', $testimonial->id)->where('type', 'dislike')->count(),
            'my_reaction' => $myReaction,
        ]);
    }
}
