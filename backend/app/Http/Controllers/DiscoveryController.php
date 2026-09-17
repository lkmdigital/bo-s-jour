<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\AdminDiscoveryController;
use App\Models\DiscoveryActivity;
use App\Models\DiscoverySite;
use App\Models\Setting;
use App\Models\ShowcaseVideo;
use App\Models\TrendingDestination;

/**
 * Contenu "Découvertes" affiché sur l'accueil (Principaux sites à voir,
 * Meilleures activités, Destinations tendances), désormais géré par
 * l'admin plutôt que codé en dur (retour client 2026-09-15). Public, en
 * lecture seule, ne renvoie que le contenu publié.
 */
class DiscoveryController extends Controller
{
    public function sites()
    {
        return response()->json([
            'data' => DiscoverySite::published()->orderBy('display_order')->orderByDesc('created_at')->get(),
        ]);
    }

    public function activities()
    {
        return response()->json([
            'data' => DiscoveryActivity::published()->orderBy('display_order')->orderByDesc('created_at')->get(),
        ]);
    }

    public function destinations()
    {
        return response()->json([
            'data' => TrendingDestination::published()->orderBy('display_order')->orderByDesc('created_at')->get(),
        ]);
    }

    public function videos()
    {
        return response()->json([
            'data' => ShowcaseVideo::published()->orderBy('display_order')->orderByDesc('created_at')->get(),
        ]);
    }

    public function showcaseText()
    {
        return response()->json([
            'title' => (string) Setting::get('showcase_title', AdminDiscoveryController::DEFAULT_SHOWCASE_TITLE),
            'description' => (string) Setting::get('showcase_description', AdminDiscoveryController::DEFAULT_SHOWCASE_DESCRIPTION),
            'image_path' => Setting::get('showcase_image_path') ?: null,
        ]);
    }
}
