<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LegalDocument;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Documents juridiques (CGV, CGU, politique de confidentialité) — Paramètres > Juridique.
 */
class AdminLegalDocumentController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['data' => LegalDocument::orderBy('slug')->get()]);
    }

    /**
     * Lecture publique d'un document publié (page légale accessible aux visiteurs).
     */
    public function publicShow(string $slug)
    {
        if (!in_array($slug, LegalDocument::SLUGS, true)) {
            return response()->json(['message' => 'Document inconnu.'], 404);
        }

        $document = LegalDocument::where('slug', $slug)->where('is_published', true)->first();

        if (!$document) {
            return response()->json(['message' => 'Ce document n\'est pas encore disponible.'], 404);
        }

        return response()->json([
            'slug' => $document->slug,
            'title' => $document->title,
            'content' => $document->content,
            'version' => $document->version,
            'published_at' => $document->published_at,
        ]);
    }

    public function update(Request $request, string $slug)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!in_array($slug, LegalDocument::SLUGS, true)) {
            return response()->json(['message' => 'Document inconnu.'], 404);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:191',
            'content' => 'sometimes|nullable|string',
            'version' => 'sometimes|string|max:20',
            'is_published' => 'sometimes|boolean',
        ]);

        $document = LegalDocument::where('slug', $slug)->firstOrFail();
        $wasPublished = $document->is_published;

        $document->fill($data);
        $document->updated_by = $request->user()->id;

        if (array_key_exists('is_published', $data) && $data['is_published'] && !$wasPublished) {
            $document->published_at = now();
        }

        $document->save();

        return response()->json(['data' => $document]);
    }
}
