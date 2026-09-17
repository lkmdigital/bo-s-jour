<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformTestimonial;
use Illuminate\Http\Request;

/**
 * Modération des avis plateforme soumis via "Laissez un avis sur boséjour"
 * (retour client 2026-09-17) — publication manuelle avant apparition dans
 * la section témoignages de l'accueil.
 */
class AdminTestimonialController extends Controller
{
    private function checkAdmin(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return null;
    }

    public function index(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        return response()->json([
            'data' => PlatformTestimonial::orderBy('is_published')->orderByDesc('created_at')->get(),
        ]);
    }

    public function publish(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $testimonial = PlatformTestimonial::findOrFail($id);
        $testimonial->update(['is_published' => true]);

        return response()->json(['data' => $testimonial]);
    }

    public function unpublish(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $testimonial = PlatformTestimonial::findOrFail($id);
        $testimonial->update(['is_published' => false]);

        return response()->json(['data' => $testimonial]);
    }

    public function destroy(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        PlatformTestimonial::findOrFail($id)->delete();

        return response()->json(['message' => 'Avis supprimé.']);
    }
}
