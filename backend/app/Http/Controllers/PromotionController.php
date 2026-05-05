<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use App\Models\Accommodation;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class PromotionController extends Controller
{
    /**
     * Liste des promotions d'un établissement
     */
    public function index(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        $user = $request->user();

        try {
            // Si l'utilisateur est authentifié et est propriétaire ou admin, retourner toutes les promotions
            if ($user && ($user->isAdmin() || $accommodation->host_id === $user->id)) {
                $promotions = Promotion::where('accommodation_id', $accommodationId)
                    ->with(['room'])
                    ->orderBy('start_date', 'desc')
                    ->get();
            } else {
                // Public: retourner uniquement les promotions actives et valides
                $today = now()->toDateString();
                $promotions = Promotion::where('accommodation_id', $accommodationId)
                    ->where('is_active', true)
                    ->where('start_date', '<=', $today)
                    ->where('end_date', '>=', $today)
                    ->with(['room'])
                    ->orderBy('discount_percent', 'desc')
                    ->get();
            }

            return response()->json($promotions);
        } catch (\Illuminate\Database\QueryException $e) {
            // Si la table promotions n'existe pas encore, retourner un tableau vide
            return response()->json([]);
        }
    }

    /**
     * Créer une nouvelle promotion
     */
    public function store(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        // Vérifier que l'utilisateur est le propriétaire ou admin
        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validator = Validator::make($request->all(), [
            'room_id' => 'nullable|exists:rooms,id',
            'discount_percent' => 'required|numeric|min:1|max:100',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Vérifier que la chambre appartient bien à l'établissement si room_id est fourni
        if ($request->room_id) {
            $room = Room::where('id', $request->room_id)
                ->where('accommodation_id', $accommodationId)
                ->first();
            
            if (!$room) {
                return response()->json([
                    'message' => 'La chambre spécifiée n\'appartient pas à cet établissement'
                ], 422);
            }
        }

        $promotion = Promotion::create([
            'accommodation_id' => $accommodationId,
            'room_id' => $request->room_id,
            'discount_percent' => $request->discount_percent,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'description' => $request->description,
            'is_active' => true,
        ]);

        return response()->json($promotion->load('room'), 201);
    }

    /**
     * Mettre à jour une promotion
     */
    public function update(Request $request, $accommodationId, $promotionId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        $promotion = Promotion::findOrFail($promotionId);

        // Vérifier que la promotion appartient à l'établissement
        if ($promotion->accommodation_id != $accommodationId) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        // Vérifier que l'utilisateur est le propriétaire ou admin
        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validator = Validator::make($request->all(), [
            'room_id' => 'nullable|exists:rooms,id',
            'discount_percent' => 'sometimes|numeric|min:1|max:100',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'description' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Vérifier que la chambre appartient bien à l'établissement si room_id est fourni
        if ($request->has('room_id') && $request->room_id) {
            $room = Room::where('id', $request->room_id)
                ->where('accommodation_id', $accommodationId)
                ->first();
            
            if (!$room) {
                return response()->json([
                    'message' => 'La chambre spécifiée n\'appartient pas à cet établissement'
                ], 422);
            }
        }

        $promotion->update($request->only([
            'room_id',
            'discount_percent',
            'start_date',
            'end_date',
            'description',
            'is_active'
        ]));

        return response()->json($promotion->load('room'));
    }

    /**
     * Supprimer une promotion
     */
    public function destroy(Request $request, $accommodationId, $promotionId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        $promotion = Promotion::findOrFail($promotionId);

        // Vérifier que la promotion appartient à l'établissement
        if ($promotion->accommodation_id != $accommodationId) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        // Vérifier que l'utilisateur est le propriétaire ou admin
        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $promotion->delete();

        return response()->json(['message' => 'Promotion supprimée avec succès']);
    }

    /**
     * Activer/Désactiver une promotion
     */
    public function toggle(Request $request, $accommodationId, $promotionId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        $promotion = Promotion::findOrFail($promotionId);

        // Vérifier que la promotion appartient à l'établissement
        if ($promotion->accommodation_id != $accommodationId) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        // Vérifier que l'utilisateur est le propriétaire ou admin
        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $promotion->is_active = !$promotion->is_active;
        $promotion->save();

        return response()->json($promotion->load('room'));
    }
}







