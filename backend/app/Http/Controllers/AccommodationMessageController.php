<?php

namespace App\Http\Controllers;

use App\Models\Accommodation;
use App\Models\Message;
use Illuminate\Http\Request;

/**
 * Retour client 2026-09-15 : "ajoute aussi la possibilité qu'un membre
 * écrive à un hôte" — jusqu'ici un voyageur ne pouvait écrire à un hôte que
 * depuis le fil d'une réservation déjà créée (BookingMessageController).
 * Ce contrôleur ouvre un fil de conversation directement depuis la fiche
 * d'un établissement, sans réservation préalable (bouton "Contacter
 * l'établissement").
 */
class AccommodationMessageController extends Controller
{
    public function store(Request $request, int $id)
    {
        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $accommodation = Accommodation::findOrFail($id);
        $user = $request->user();

        if (!$accommodation->host_id || $accommodation->host_id === $user->hostScopeId()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if ($accommodation->status !== 'published') {
            return response()->json(['message' => "Cet établissement n'est pas disponible pour le moment."], 422);
        }

        $message = Message::create([
            'recipient_id' => $accommodation->host_id,
            'sender_id' => $user->id,
            'is_from_platform' => false,
            'subject' => 'Question sur ' . $accommodation->name,
            'body' => $request->body,
        ]);

        $message->load(['sender:id,name', 'recipient:id,name']);

        return response()->json($message, 201);
    }
}
