<?php

namespace App\Http\Controllers;

use App\Models\DiscoveryActivity;
use App\Models\DiscoverySite;

/**
 * Contenu "Découvertes" affiché sur l'accueil (Principaux sites à voir,
 * Meilleures activités), désormais géré par l'admin plutôt que codé en dur
 * (retour client 2026-09-15). Public, en lecture seule, ne renvoie que le
 * contenu publié.
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
}
