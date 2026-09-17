<?php

namespace App\Http\Controllers;

use App\Models\PlatformTestimonial;
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
    public function index()
    {
        return response()->json([
            'data' => PlatformTestimonial::published()
                ->orderByDesc('created_at')
                ->limit(30)
                ->get(['id', 'first_name', 'avatar_path', 'comment']),
        ]);
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
}
