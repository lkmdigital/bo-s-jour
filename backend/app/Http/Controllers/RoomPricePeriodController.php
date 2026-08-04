<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomPricePeriod;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Gestion des périodes tarifaires d'une chambre (tarification saisonnière).
 * L'hôte programme un prix par nuit sur une plage de dates (mois, saison...)
 * pour l'année en cours ou l'année suivante. Le système applique
 * automatiquement ces prix aux réservations couvrant ces dates.
 */
class RoomPricePeriodController extends Controller
{
    public function index(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($forbidden = $this->checkAccess($request, $room)) {
            return $forbidden;
        }

        $periods = RoomPricePeriod::where('room_id', $roomId)
            ->orderBy('start_date')
            ->get();

        return response()->json([
            'base_price' => (float) $room->price_per_night,
            'periods' => $periods,
        ]);
    }

    public function store(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($forbidden = $this->checkAccess($request, $room)) {
            return $forbidden;
        }

        $request->validate([
            'label' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'price_per_night' => 'required|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($error = $this->validatePeriodWindow($request->start_date, $request->end_date)) {
            return response()->json(['message' => $error], 422);
        }

        if ($this->hasOverlap($roomId, $request->start_date, $request->end_date)) {
            return response()->json([
                'message' => 'Une période tarifaire active existe déjà sur ces dates. Modifiez-la ou choisissez une autre plage.',
            ], 422);
        }

        $period = RoomPricePeriod::create([
            'room_id' => $room->id,
            'label' => $request->label,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'price_per_night' => $request->price_per_night,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json($period, 201);
    }

    public function update(Request $request, $accommodationId, $roomId, $id)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($forbidden = $this->checkAccess($request, $room)) {
            return $forbidden;
        }

        $period = RoomPricePeriod::where('room_id', $roomId)->findOrFail($id);

        $request->validate([
            'label' => 'nullable|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date',
            'price_per_night' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $startDate = $request->input('start_date', $period->start_date->toDateString());
        $endDate = $request->input('end_date', $period->end_date->toDateString());

        if ($endDate < $startDate) {
            return response()->json(['message' => 'La date de fin doit être après la date de début.'], 422);
        }

        if ($error = $this->validatePeriodWindow($startDate, $endDate)) {
            return response()->json(['message' => $error], 422);
        }

        $willBeActive = $request->has('is_active') ? $request->boolean('is_active') : $period->is_active;
        if ($willBeActive && $this->hasOverlap($roomId, $startDate, $endDate, $period->id)) {
            return response()->json([
                'message' => 'Une période tarifaire active existe déjà sur ces dates. Modifiez-la ou choisissez une autre plage.',
            ], 422);
        }

        $period->update(array_merge(
            $request->only(['label', 'start_date', 'end_date', 'price_per_night']),
            $request->has('is_active') ? ['is_active' => $request->boolean('is_active')] : []
        ));

        return response()->json($period);
    }

    public function destroy(Request $request, $accommodationId, $roomId, $id)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($forbidden = $this->checkAccess($request, $room)) {
            return $forbidden;
        }

        $period = RoomPricePeriod::where('room_id', $roomId)->findOrFail($id);
        $period->delete();

        return response()->json(['message' => 'Période tarifaire supprimée avec succès']);
    }

    /**
     * Seul l'admin ou l'hôte propriétaire peut gérer les périodes tarifaires.
     */
    private function checkAccess(Request $request, Room $room)
    {
        $user = $request->user();
        $isAdmin = $user && $user->isAdmin();
        $isHostOwner = $user && $user->isHost() && $room->accommodation->host_id === $user->id;

        if (!$isAdmin && !$isHostOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return null;
    }

    /**
     * Les périodes sont limitées à l'année en cours et l'année suivante.
     */
    private function validatePeriodWindow(string $startDate, string $endDate): ?string
    {
        $minDate = Carbon::now()->startOfYear();
        $maxDate = Carbon::now()->addYear()->endOfYear();

        if (Carbon::parse($startDate)->lt($minDate) || Carbon::parse($endDate)->gt($maxDate)) {
            return "Les périodes tarifaires doivent être comprises entre le {$minDate->format('d/m/Y')} et le {$maxDate->format('d/m/Y')} (année en cours ou année suivante).";
        }

        return null;
    }

    /**
     * Empêche deux périodes actives de se chevaucher (prix déterministe).
     */
    private function hasOverlap($roomId, string $startDate, string $endDate, ?int $excludeId = null): bool
    {
        $query = RoomPricePeriod::where('room_id', $roomId)
            ->active()
            ->overlapping($startDate, $endDate);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
