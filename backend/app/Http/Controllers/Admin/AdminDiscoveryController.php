<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscoveryActivity;
use App\Models\DiscoverySite;
use App\Models\TrendingDestination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Retour client 2026-09-15 : « Principaux sites à voir » et « Meilleures
 * activités à Abidjan » sur l'accueil étaient du contenu inventé (photos
 * Unsplash, noms de lieux codés en dur) — le client veut du vrai contenu,
 * géré par l'admin. Ce module gère les deux, masqués côté public tant
 * qu'aucune entrée n'est publiée (voir DiscoveryController côté public).
 */
class AdminDiscoveryController extends Controller
{
    private function checkAdmin(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Sites à voir
    // ------------------------------------------------------------------

    public function sites(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        return response()->json(['data' => DiscoverySite::orderBy('display_order')->orderByDesc('created_at')->get()]);
    }

    public function storeSite(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'city' => 'nullable|string|max:255',
            // Retour client 2026-09-16 : catégories de voyage (mêmes principe
            // que discovery_activities.categories — un site peut appartenir à
            // plusieurs), pour filtrer "Les destinations tendances".
            'categories' => 'nullable|array',
            'categories.*' => 'string|in:business,balneaire,tourisme_culture,escapade_weekend',
            'display_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'image' => 'required|file|image|max:5120',
        ]);

        $path = $request->file('image')->store('discovery/sites', 'public');

        $site = DiscoverySite::create([
            'name' => $validated['name'],
            'city' => $validated['city'] ?? null,
            'categories' => $validated['categories'] ?? [],
            'display_order' => $validated['display_order'] ?? 0,
            'is_published' => $request->boolean('is_published', false),
            'image_path' => Storage::url($path),
        ]);

        return response()->json(['data' => $site], 201);
    }

    public function updateSite(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $site = DiscoverySite::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'city' => 'nullable|string|max:255',
            'categories' => 'nullable|array',
            'categories.*' => 'string|in:business,balneaire,tourisme_culture,escapade_weekend',
            'display_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'image' => 'nullable|file|image|max:5120',
        ]);

        $updateData = array_intersect_key($validated, array_flip(['name', 'city', 'categories', 'display_order']));
        if ($request->has('is_published')) {
            $updateData['is_published'] = $request->boolean('is_published');
        }

        if ($request->hasFile('image')) {
            $oldPath = str_replace('/storage/', '', $site->image_path);
            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('discovery/sites', 'public');
            $updateData['image_path'] = Storage::url($path);
        }

        $site->update($updateData);

        return response()->json(['data' => $site->fresh()]);
    }

    public function destroySite(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $site = DiscoverySite::findOrFail($id);
        $oldPath = str_replace('/storage/', '', $site->image_path);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }
        $site->delete();

        return response()->json(['message' => 'Site supprimé.']);
    }

    // ------------------------------------------------------------------
    // Activités
    // ------------------------------------------------------------------

    public function activities(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        return response()->json(['data' => DiscoveryActivity::orderBy('display_order')->orderByDesc('created_at')->get()]);
    }

    public function storeActivity(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'categories' => 'nullable|array',
            'categories.*' => 'string|in:plage,musee,voir,nourriture,vie_nocturne',
            'search_term' => 'nullable|string|max:255',
            'display_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'image' => 'required|file|image|max:5120',
        ]);

        $path = $request->file('image')->store('discovery/activities', 'public');

        $activity = DiscoveryActivity::create([
            'name' => $validated['name'],
            'categories' => $validated['categories'] ?? [],
            'search_term' => $validated['search_term'] ?? null,
            'display_order' => $validated['display_order'] ?? 0,
            'is_published' => $request->boolean('is_published', false),
            'image_path' => Storage::url($path),
        ]);

        return response()->json(['data' => $activity], 201);
    }

    public function updateActivity(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $activity = DiscoveryActivity::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'categories' => 'nullable|array',
            'categories.*' => 'string|in:plage,musee,voir,nourriture,vie_nocturne',
            'search_term' => 'nullable|string|max:255',
            'display_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'image' => 'nullable|file|image|max:5120',
        ]);

        $updateData = array_intersect_key($validated, array_flip(['name', 'categories', 'search_term', 'display_order']));
        if ($request->has('is_published')) {
            $updateData['is_published'] = $request->boolean('is_published');
        }

        if ($request->hasFile('image')) {
            $oldPath = str_replace('/storage/', '', $activity->image_path);
            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('discovery/activities', 'public');
            $updateData['image_path'] = Storage::url($path);
        }

        $activity->update($updateData);

        return response()->json(['data' => $activity->fresh()]);
    }

    public function destroyActivity(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $activity = DiscoveryActivity::findOrFail($id);
        $oldPath = str_replace('/storage/', '', $activity->image_path);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }
        $activity->delete();

        return response()->json(['message' => 'Activité supprimée.']);
    }

    // ------------------------------------------------------------------
    // Destinations tendances
    // ------------------------------------------------------------------

    public function destinations(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        return response()->json(['data' => TrendingDestination::orderBy('display_order')->orderByDesc('created_at')->get()]);
    }

    public function storeDestination(Request $request)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $validated = $request->validate([
            'city' => 'required|string|max:255',
            'from_price' => 'required|integer|min:0',
            'accommodations_count' => 'required|integer|min:0',
            'categories' => 'nullable|array',
            'categories.*' => 'string|in:business,balneaire,tourisme_culture,escapade_weekend',
            'display_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'image' => 'required|file|image|max:5120',
        ]);

        $path = $request->file('image')->store('discovery/destinations', 'public');

        $destination = TrendingDestination::create([
            'city' => $validated['city'],
            'from_price' => $validated['from_price'],
            'accommodations_count' => $validated['accommodations_count'],
            'categories' => $validated['categories'] ?? [],
            'display_order' => $validated['display_order'] ?? 0,
            'is_published' => $request->boolean('is_published', false),
            'image_path' => Storage::url($path),
        ]);

        return response()->json(['data' => $destination], 201);
    }

    public function updateDestination(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $destination = TrendingDestination::findOrFail($id);

        $validated = $request->validate([
            'city' => 'sometimes|required|string|max:255',
            'from_price' => 'sometimes|required|integer|min:0',
            'accommodations_count' => 'sometimes|required|integer|min:0',
            'categories' => 'nullable|array',
            'categories.*' => 'string|in:business,balneaire,tourisme_culture,escapade_weekend',
            'display_order' => 'nullable|integer|min:0',
            'is_published' => 'nullable|boolean',
            'image' => 'nullable|file|image|max:5120',
        ]);

        $updateData = array_intersect_key($validated, array_flip(['city', 'from_price', 'accommodations_count', 'categories', 'display_order']));
        if ($request->has('is_published')) {
            $updateData['is_published'] = $request->boolean('is_published');
        }

        if ($request->hasFile('image')) {
            $oldPath = str_replace('/storage/', '', $destination->image_path);
            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('discovery/destinations', 'public');
            $updateData['image_path'] = Storage::url($path);
        }

        $destination->update($updateData);

        return response()->json(['data' => $destination->fresh()]);
    }

    public function destroyDestination(Request $request, int $id)
    {
        if ($forbidden = $this->checkAdmin($request)) return $forbidden;

        $destination = TrendingDestination::findOrFail($id);
        $oldPath = str_replace('/storage/', '', $destination->image_path);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }
        $destination->delete();

        return response()->json(['message' => 'Destination supprimée.']);
    }
}
