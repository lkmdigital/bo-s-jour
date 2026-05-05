<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\HostValidationHistory;
use App\Models\AdminNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controller pour la gestion des hôtes par les admins
 */
class AdminHostController extends Controller
{
    /**
     * Liste des hôtes avec filtres
     */
    public function index(Request $request)
    {
        $query = User::where('role', 'host')
            ->with(['roles', 'accommodations', 'hostValidationHistory.validator']);

        // Filtres
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('establishment_name', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('profile_verified')) {
            $query->where('profile_verified', $request->profile_verified === 'true');
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $hosts = $query->paginate($perPage);

        $hosts->getCollection()->transform(function (User $host) {
            $host->compliance_status = $host->compliance_status;
            return $host;
        });

        return response()->json([
            'data' => $hosts->items(),
            'pagination' => [
                'current_page' => $hosts->currentPage(),
                'last_page' => $hosts->lastPage(),
                'per_page' => $hosts->perPage(),
                'total' => $hosts->total(),
            ],
        ]);
    }

    /**
     * Détails d'un hôte
     */
    public function show($id)
    {
        $host = User::where('role', 'host')
            ->with([
                'roles',
                'accommodations',
                'hostValidationHistory.validator',
                'adminNotes.creator',
            ])
            ->findOrFail($id);

        $this->authorize('view', $host);

        $host->compliance_status = $host->compliance_status;
        $host->compliance_requirements = $host->compliance_requirements;

        return response()->json(['data' => $host]);
    }

    /**
     * Valider un hôte
     */
    public function validate(Request $request, $id)
    {
        $host = User::where('role', 'host')->findOrFail($id);
        $this->authorize('validate', $host);

        $requirements = $host->compliance_requirements;
        $missing = collect($requirements)
            ->filter(fn ($item) => empty($item['ok']))
            ->pluck('label')
            ->values();

        if ($missing->isNotEmpty()) {
            return response()->json([
                'message' => 'Profil non conforme: certains documents/informations obligatoires sont manquants.',
                'compliance_status' => 'non_conforme',
                'missing_requirements' => $missing,
            ], 422);
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:2000',
            'internal_notes' => 'nullable|string|max:5000',
            'validation_data' => 'nullable|array',
        ]);

        // Mettre à jour le statut
        $host->update([
            'profile_verified' => true,
            'profile_verified_at' => now(),
            'verification_notes' => $validated['comment'] ?? null,
        ]);

        // Créer l'historique
        HostValidationHistory::create([
            'host_id' => $host->id,
            'action' => 'validated',
            'validated_by' => $request->user()->id,
            'comment' => $validated['comment'] ?? null,
            'internal_notes' => $validated['internal_notes'] ?? null,
            'validation_data' => $validated['validation_data'] ?? null,
        ]);

        return response()->json([
            'message' => 'Hôte validé avec succès',
            'data' => $host->load('hostValidationHistory'),
            'compliance_status' => 'conforme',
        ]);
    }

    /**
     * Rejeter un hôte
     */
    public function reject(Request $request, $id)
    {
        $host = User::where('role', 'host')->findOrFail($id);
        $this->authorize('reject', $host);

        $validated = $request->validate([
            'comment' => 'required|string|max:2000',
            'internal_notes' => 'nullable|string|max:5000',
        ]);

        // Mettre à jour le statut
        $host->update([
            'profile_verified' => false,
            'verification_notes' => $validated['comment'],
        ]);

        // Créer l'historique
        HostValidationHistory::create([
            'host_id' => $host->id,
            'action' => 'rejected',
            'validated_by' => $request->user()->id,
            'comment' => $validated['comment'],
            'internal_notes' => $validated['internal_notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Hôte rejeté avec succès',
            'data' => $host->load('hostValidationHistory'),
        ]);
    }

    /**
     * Suspendre un hôte
     */
    public function suspend(Request $request, $id)
    {
        $host = User::where('role', 'host')->findOrFail($id);
        $this->authorize('suspend', $host);

        $validated = $request->validate([
            'comment' => 'nullable|string|max:2000',
            'internal_notes' => 'nullable|string|max:5000',
        ]);

        $host->update(['status' => 'suspended']);

        HostValidationHistory::create([
            'host_id' => $host->id,
            'action' => 'suspended',
            'validated_by' => $request->user()->id,
            'comment' => $validated['comment'] ?? null,
            'internal_notes' => $validated['internal_notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Hôte suspendu avec succès',
            'data' => $host,
        ]);
    }

    /**
     * Retirer le statut hôte
     */
    public function removeHostStatus(Request $request, $id)
    {
        $host = User::where('role', 'host')->findOrFail($id);
        $this->authorize('removeHostStatus', $host);

        $validated = $request->validate([
            'comment' => 'required|string|max:2000',
        ]);

        // Retirer le rôle hôte
        $host->update(['role' => 'user']);

        HostValidationHistory::create([
            'host_id' => $host->id,
            'action' => 'removed',
            'validated_by' => $request->user()->id,
            'comment' => $validated['comment'],
        ]);

        return response()->json([
            'message' => 'Statut hôte retiré avec succès',
            'data' => $host,
        ]);
    }

    /**
     * Ajouter une note interne
     */
    public function addNote(Request $request, $id)
    {
        $host = User::where('role', 'host')->findOrFail($id);
        $this->authorize('createInternalNotes', $host);

        $validated = $request->validate([
            'note' => 'required|string|max:5000',
            'visibility' => ['required', 'in:admin,gerant,admin_gerant'],
            'is_important' => 'boolean',
        ]);

        $note = AdminNote::create([
            'noteable_type' => User::class,
            'noteable_id' => $host->id,
            'created_by' => $request->user()->id,
            'note' => $validated['note'],
            'visibility' => $validated['visibility'],
            'is_important' => $validated['is_important'] ?? false,
        ]);

        return response()->json([
            'message' => 'Note ajoutée avec succès',
            'data' => $note->load('creator'),
        ], 201);
    }

    /**
     * Liste des établissements d'un hôte
     */
    public function accommodations($id)
    {
        $host = User::where('role', 'host')->findOrFail($id);
        $this->authorize('view', $host);

        $accommodations = $host->accommodations()
            ->with(['images', 'reviews'])
            ->paginate(15);

        return response()->json(['data' => $accommodations]);
    }
}

