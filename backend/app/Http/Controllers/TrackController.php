<?php

namespace App\Http\Controllers;

use App\Services\Ops\VisitRecorder;
use Illuminate\Http\Request;

/**
 * Réception des pages vues du site (voir components/analytics/VisitTracker.tsx). Réponse toujours vide et rapide :
 * aucune erreur n'est jamais renvoyée au visiteur, une mesure ratée ne doit rien casser.
 */
class TrackController extends Controller
{
    public function store(Request $request, VisitRecorder $recorder)
    {
        // Envoyé en « text/plain » par sendBeacon (évite une requête de pré-vérification CORS) : on lit le corps brut.
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !is_string($data['path'] ?? null)) {
            return response()->noContent();
        }

        try {
            $recorder->record($request, $data['path'], is_string($data['referrer'] ?? null) ? $data['referrer'] : null);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->noContent();
    }
}
