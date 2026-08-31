<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Controller pour la gestion des utilisateurs par les admins
 */
class AdminUserController extends Controller
{
    /**
     * Liste des utilisateurs avec filtres et pagination
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $query = User::with(['roles', 'blockedByUser']);

        // Filtres
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('role_id')) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('roles.id', $request->role_id);
            });
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $users = $query->paginate($perPage);

        return response()->json([
            'data' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * Détails d'un utilisateur
     */
    public function show($id)
    {
        $user = User::with([
            'roles.permissions',
            'activityLogs' => function ($query) {
                $query->latest()->limit(50);
            },
            'blockedByUser',
            'accommodations',
            'bookings',
        ])->findOrFail($id);

        $this->authorize('view', $user);

        return response()->json(['data' => $user]);
    }

    /**
     * Créer un utilisateur
     */
    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['user', 'host', 'admin'])],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked', 'suspended'])],
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? 'active',
        ]);

        // Assigner les rôles RBAC si fournis
        if (!empty($validated['role_ids'])) {
            $user->roles()->sync($validated['role_ids']);
        }

        // Log de l'action
        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.created',
            'model_type' => User::class,
            'model_id' => $user->id,
            'new_values' => $user->toArray(),
            'description' => "Création de l'utilisateur {$user->name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['data' => $user->load('roles')], 201);
    }

    /**
     * Mettre à jour un utilisateur
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('update', $user);

        $oldValues = $user->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($id)],
            'phone' => 'nullable|string|max:20',
            'role' => ['sometimes', Rule::in(['user', 'host', 'admin'])],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'blocked', 'suspended'])],
        ]);

        // Le changement de rôle est un pouvoir distinct et plus sensible qu'une simple mise à
        // jour de profil (le rôle legacy "admin" court-circuite tout le RBAC — voir
        // User::hasPermission()) : il doit passer par la même barrière que assignRoles(),
        // jamais être accordé par la simple autorisation "update" — qui, elle, s'auto-accorde
        // à tout utilisateur sur son propre compte et permettrait sinon une auto-promotion.
        if (array_key_exists('role', $validated)) {
            $this->authorize('manageRoles', $user);
        }

        $user->update($validated);

        // Log de l'action
        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.updated',
            'model_type' => User::class,
            'model_id' => $user->id,
            'old_values' => $oldValues,
            'new_values' => $user->toArray(),
            'description' => "Mise à jour de l'utilisateur {$user->name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['data' => $user]);
    }

    /**
     * Bloquer un utilisateur
     */
    public function block(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('block', $user);

        $validated = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $user->block($request->user()->id, $validated['reason'] ?? null);

        // Log de l'action
        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.blocked',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Blocage de l'utilisateur {$user->name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Utilisateur bloqué avec succès', 'data' => $user]);
    }

    /**
     * Débloquer un utilisateur
     */
    public function unblock(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('unblock', $user);

        $user->unblock();

        // Log de l'action
        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.unblocked',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Déblocage de l'utilisateur {$user->name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Utilisateur débloqué avec succès', 'data' => $user]);
    }

    /**
     * Supprimer définitivement un utilisateur.
     * Refusé si l'utilisateur a des réservations ou (en tant qu'hôte) des établissements,
     * car la suppression est en cascade au niveau base de données (bookings, accommodations
     * et tout ce qui en dépend seraient irrémédiablement perdus).
     */
    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('delete', $user);

        $bookingsCount = $user->bookings()->count();
        $accommodationsCount = $user->accommodations()->count();

        if ($bookingsCount > 0 || $accommodationsCount > 0) {
            return response()->json([
                'message' => "Impossible de supprimer cet utilisateur : il a {$bookingsCount} réservation(s) et {$accommodationsCount} établissement(s) lié(s). Bloquez le compte à la place, ou retirez/transférez d'abord ces éléments.",
            ], 422);
        }

        $name = $user->name;
        $email = $user->email;

        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.deleted',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Suppression définitive de l'utilisateur {$name} ({$email})",
            'ip_address' => $request->ip(),
        ]);

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé définitivement']);
    }

    /**
     * Déclencher la réinitialisation du mot de passe d'un utilisateur (envoi d'un lien par email),
     * réutilisant le même mécanisme que le flux "mot de passe oublié" en self-service.
     */
    public function resetPassword(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('update', $user);

        $token = Str::random(64);

        DB::table('password_reset_tokens')->upsert(
            [
                'email' => $user->email,
                'token' => Hash::make($token),
                'created_at' => now(),
            ],
            ['email'],
            ['token', 'created_at']
        );

        $resetUrl = 'https://bosejour.ci/auth/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email);

        try {
            Mail::to($user->email)->send(new PasswordResetMail($user->name, $resetUrl));
        } catch (\Throwable $e) {
            Log::error('Admin password reset email failed: ' . $e->getMessage(), ['email' => $user->email]);
            return response()->json(['message' => "Le lien a été généré mais l'envoi de l'email a échoué."], 500);
        }

        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.password_reset_sent',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => "Lien de réinitialisation de mot de passe envoyé à {$user->name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Un lien de réinitialisation a été envoyé à ' . $user->email]);
    }

    /**
     * Assigner des rôles à un utilisateur
     */
    public function assignRoles(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('manageRoles', $user);

        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $user->roles()->sync($validated['role_ids']);

        // Log de l'action
        UserActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.roles_assigned',
            'model_type' => User::class,
            'model_id' => $user->id,
            'new_values' => ['role_ids' => $validated['role_ids']],
            'description' => "Assignation de rôles à l'utilisateur {$user->name}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Rôles assignés avec succès', 'data' => $user->load('roles')]);
    }

    /**
     * Historique des activités d'un utilisateur
     */
    public function activityLogs($id)
    {
        $user = User::findOrFail($id);
        $this->authorize('view', $user);

        $logs = UserActivityLog::where('user_id', $id)
            ->latest()
            ->paginate(50);

        return response()->json(['data' => $logs]);
    }

    /**
     * Récupérer la liste des rôles disponibles
     */
    public function roles()
    {
        $this->authorize('viewAny', User::class);

        $roles = Role::where('active', true)
            ->orderBy('level')
            ->get(['id', 'name', 'display_name', 'description']);

        return response()->json(['data' => $roles]);
    }

    /**
     * Récupérer la liste des hôtes (pour la création d'établissements)
     */
    public function hosts()
    {
        $this->authorize('viewAny', User::class);

        $hosts = User::where('role', 'host')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone', 'establishment_name']);

        return response()->json(['data' => $hosts]);
    }
}

