<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Accommodation;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    public function store(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'requested_at' => 'required|date|after:now',
            'notes' => 'nullable|string|max:2000',
        ]);

        $appointment = Appointment::create([
            'accommodation_id' => $accommodation->id,
            'user_id' => $request->user()->id,
            'requested_at' => Carbon::parse($request->requested_at),
            'status' => 'pending',
            'notes' => $request->notes,
        ]);

        return response()->json($appointment, 201);
    }

    public function index(Request $request)
    {
        if ($request->user()->isAdmin()) {
            return response()->json(Appointment::with(['accommodation', 'user'])->orderBy('created_at', 'desc')->get());
        }

        if ($request->user()->isHost()) {
            return response()->json(
                Appointment::with(['accommodation', 'user'])
                    ->whereHas('accommodation', function ($q) use ($request) {
                        $q->where('host_id', $request->user()->hostScopeId());
                    })
                    ->orderBy('created_at', 'desc')
                    ->get()
            );
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }
}


