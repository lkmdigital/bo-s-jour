<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\Accommodation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StaffController extends Controller
{
    /**
     * Liste du personnel d'un établissement
     */
    public function index(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $staff = Staff::where('accommodation_id', $accommodationId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($staff);
    }

    /**
     * Ajouter un membre du personnel
     */
    public function store(Request $request, $accommodationId)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);

        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $staff = Staff::create([
            'accommodation_id' => $accommodationId,
            'name' => $request->name,
            'role' => $request->role,
            'email' => $request->email,
            'phone' => $request->phone,
            'status' => $request->status ?? 'active',
        ]);

        return response()->json($staff, 201);
    }

    /**
     * Modifier un membre du personnel
     */
    public function update(Request $request, $accommodationId, $id)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        $staff = Staff::findOrFail($id);

        if ($staff->accommodation_id != $accommodationId) {
            return response()->json(['message' => 'Staff not found'], 404);
        }

        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'role' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'status' => 'sometimes|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $staff->update($request->only(['name', 'role', 'email', 'phone', 'status']));

        return response()->json($staff);
    }

    /**
     * Supprimer un membre du personnel
     */
    public function destroy(Request $request, $accommodationId, $id)
    {
        $accommodation = Accommodation::findOrFail($accommodationId);
        $staff = Staff::findOrFail($id);

        if ($staff->accommodation_id != $accommodationId) {
            return response()->json(['message' => 'Staff not found'], 404);
        }

        if (!$request->user()->isAdmin() && $accommodation->host_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $staff->delete();

        return response()->json(['message' => 'Membre du personnel supprimé avec succès']);
    }
}
