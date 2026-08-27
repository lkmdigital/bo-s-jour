<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Review;
use App\Models\Room;
use App\Services\HostContentAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Génération de contenu partenaire (doc client "MODULE IA BOSÉJOUR" §2.2-
 * 2.4, §2.10 partiel). Voir HostContentAiService pour la logique.
 *
 * Chaque action reçoit un ID choisi par l'appelant (accommodation_id,
 * room_id, review_id) — contrairement aux outils de HostAiAssistantService
 * où le scope hôte est implicite côté serveur, ici la vérification de
 * propriété doit être explicite avant toute génération, pour qu'un hôte ne
 * puisse jamais déclencher une génération sur l'établissement d'un autre.
 *
 * Ordre volontaire dans chaque action : rôle -> propriété -> configuration
 * IA -> génération. La propriété est vérifiée AVANT la disponibilité du
 * module pour que les deux échecs restent distinguables (404 vs 503) quel
 * que soit l'état de la clé API — testé explicitement en vérification.
 */
class HostAiContentController extends Controller
{
    private function requireHost(Request $request): mixed
    {
        $host = $request->user();
        if (!$host || !$host->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return null;
    }

    private function requireConfigured(HostContentAiService $service): mixed
    {
        if (!$service->isConfigured()) {
            return response()->json([
                'message' => "Le module IA n'est pas encore configuré. Contactez l'équipe bo séjour.",
            ], 503);
        }

        return null;
    }

    public function accommodationDescription(Request $request)
    {
        if ($forbidden = $this->requireHost($request)) {
            return $forbidden;
        }

        $data = $request->validate([
            'accommodation_id' => 'required|integer',
            'mode' => 'required|string|in:write,improve',
        ]);

        $accommodation = Accommodation::find($data['accommodation_id']);
        if (!$accommodation || $accommodation->host_id !== $request->user()->hostScopeId()) {
            return response()->json(['message' => 'Établissement introuvable.'], 404);
        }

        $service = new HostContentAiService();
        if ($unavailable = $this->requireConfigured($service)) {
            return $unavailable;
        }

        return $this->respond(fn () => $service->generateAccommodationDescription($accommodation, $data['mode']));
    }

    public function roomDescription(Request $request)
    {
        if ($forbidden = $this->requireHost($request)) {
            return $forbidden;
        }

        $data = $request->validate([
            'room_id' => 'required|integer',
            'mode' => 'required|string|in:write,improve',
        ]);

        $room = Room::with('accommodation')->find($data['room_id']);
        if (!$room || !$room->accommodation || $room->accommodation->host_id !== $request->user()->hostScopeId()) {
            return response()->json(['message' => 'Chambre introuvable.'], 404);
        }

        $service = new HostContentAiService();
        if ($unavailable = $this->requireConfigured($service)) {
            return $unavailable;
        }

        return $this->respond(fn () => $service->generateRoomDescription($room, $data['mode']));
    }

    public function translate(Request $request)
    {
        if ($forbidden = $this->requireHost($request)) {
            return $forbidden;
        }

        $data = $request->validate([
            'text' => 'required|string|max:2000',
        ]);

        $service = new HostContentAiService();
        if ($unavailable = $this->requireConfigured($service)) {
            return $unavailable;
        }

        return $this->respond(fn () => $service->translateText($data['text']));
    }

    public function seoSuggestions(Request $request)
    {
        if ($forbidden = $this->requireHost($request)) {
            return $forbidden;
        }

        $data = $request->validate([
            'accommodation_id' => 'required|integer',
        ]);

        $accommodation = Accommodation::find($data['accommodation_id']);
        if (!$accommodation || $accommodation->host_id !== $request->user()->hostScopeId()) {
            return response()->json(['message' => 'Établissement introuvable.'], 404);
        }

        $service = new HostContentAiService();
        if ($unavailable = $this->requireConfigured($service)) {
            return $unavailable;
        }

        return $this->respond(fn () => $service->suggestSeo($accommodation));
    }

    public function reviewReply(Request $request)
    {
        if ($forbidden = $this->requireHost($request)) {
            return $forbidden;
        }

        $data = $request->validate([
            'review_id' => 'required|integer',
        ]);

        $review = Review::with('accommodation')->find($data['review_id']);
        if (!$review || !$review->accommodation || $review->accommodation->host_id !== $request->user()->hostScopeId()) {
            return response()->json(['message' => 'Avis introuvable.'], 404);
        }

        $service = new HostContentAiService();
        if ($unavailable = $this->requireConfigured($service)) {
            return $unavailable;
        }

        return $this->respond(fn () => $service->draftReviewReply($review));
    }

    private function respond(\Closure $generate)
    {
        try {
            return response()->json(['data' => ['text' => $generate()]]);
        } catch (\Throwable $e) {
            Log::error('Erreur génération de contenu IA partenaire', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => "L'assistant IA n'a pas pu générer de contenu pour le moment. Réessayez dans un instant.",
            ], 502);
        }
    }
}
