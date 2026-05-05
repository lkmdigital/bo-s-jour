<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomAvailability;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RoomAvailabilityController extends Controller
{
    public function index(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($room->accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $startDate = $request->get('start_date', Carbon::now()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->addMonths(3)->format('Y-m-d'));

        $availabilities = RoomAvailability::where('room_id', $roomId)
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->get();

        return response()->json($availabilities);
    }

    public function store(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($room->accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'status' => 'required|string|in:available,occupied,blocked,maintenance',
            'price_override' => 'nullable|numeric|min:0',
        ]);

        $availability = RoomAvailability::updateOrCreate(
            [
                'room_id' => $roomId,
                'date' => $request->date,
            ],
            [
                'status' => $request->status,
                'price_override' => $request->price_override,
            ]
        );

        return response()->json($availability, 201);
    }

    public function bulkUpdate(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($room->accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'required|string|in:available,occupied,blocked,maintenance',
            'price_override' => 'nullable|numeric|min:0',
        ]);

        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $dates = [];

        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $dates[] = $current->format('Y-m-d');
            $current->addDay();
        }

        $updated = [];
        foreach ($dates as $date) {
            $availability = RoomAvailability::updateOrCreate(
                [
                    'room_id' => $roomId,
                    'date' => $date,
                ],
                [
                    'status' => $request->status,
                    'price_override' => $request->price_override,
                ]
            );
            $updated[] = $availability;
        }

        return response()->json([
            'message' => 'Availability updated successfully',
            'updated_count' => count($updated),
            'availabilities' => $updated,
        ]);
    }

    public function update(Request $request, $accommodationId, $roomId, $id)
    {
        $availability = RoomAvailability::where('room_id', $roomId)
            ->whereHas('room.accommodation', function($q) use ($accommodationId) {
                $q->where('id', $accommodationId);
            })
            ->findOrFail($id);

        if ($availability->room->accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => 'sometimes|string|in:available,occupied,blocked,maintenance',
            'price_override' => 'nullable|numeric|min:0',
        ]);

        $availability->update($request->only(['status', 'price_override']));

        return response()->json($availability);
    }

    public function destroy(Request $request, $accommodationId, $roomId, $id)
    {
        $availability = RoomAvailability::where('room_id', $roomId)
            ->whereHas('room.accommodation', function($q) use ($accommodationId) {
                $q->where('id', $accommodationId);
            })
            ->findOrFail($id);

        if ($availability->room->accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $availability->delete();

        return response()->json(['message' => 'Availability deleted successfully']);
    }

    public function getCalendar(Request $request, $accommodationId, $roomId)
    {
        $room = Room::where('accommodation_id', $accommodationId)->findOrFail($roomId);

        if ($room->accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $startDate = $request->get('start_date', Carbon::now()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->addMonths(2)->format('Y-m-d'));

        $availabilities = RoomAvailability::where('room_id', $roomId)
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Generate calendar structure
        $calendar = [];
        $current = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        while ($current->lte($end)) {
            $dateStr = $current->format('Y-m-d');
            $availability = $availabilities[$dateStr] ?? null;
            $calendar[] = [
                'date' => $dateStr,
                'status' => $availability?->status ?? 'available',
                'price_override' => $availability?->price_override,
            ];
            $current->addDay();
        }

        return response()->json([
            'room_id' => (int) $room->id,
            'base_price' => (float) $room->price_per_night,
            'calendar' => $calendar,
        ]);
    }
}
