<?php

namespace App\Http\Controllers;

use App\Models\HostStaff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Menu "Personnel" de l'extranet partenaire (brief Extranet Partenaire, Phase 13) :
 * gestion des collaborateurs de l'hôte (réceptionniste, comptabilité, commercial,
 * housekeeping, maintenance, administrateur).
 *
 * Isolation des données : un collaborateur activé devient un compte "host" normal
 * rattaché au propriétaire via staff_owner_id (voir User::hostScopeId()) — c'est la
 * frontière de sécurité réelle. La visibilité des menus selon le rôle (staff_role)
 * n'est qu'une question d'UX, gérée côté frontend.
 *
 * Gestion des collaborateurs (inviter/modifier/retirer) réservée au propriétaire du
 * compte ou à un collaborateur "Administrateur".
 */
class HostStaffController extends Controller
{
    private function assertCanManageStaff(Request $request): void
    {
        $user = $request->user();
        if ($user->isStaff() && $user->staff_role !== 'administrateur') {
            abort(403, "Réservé au propriétaire du compte ou à un administrateur.");
        }
    }

    public function index(Request $request)
    {
        $this->assertCanManageStaff($request);

        $staff = HostStaff::where('owner_id', $request->user()->hostScopeId())
            ->with('collaboratorUser:id,name,email,avatar,last_login_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($staff);
    }

    /**
     * Inviter un collaborateur. S'il possède déjà un compte voyageur bo séjour, il est
     * immédiatement lié et activé (converti en compte host rattaché) ; sinon un lien
     * d'activation sécurisé lui est envoyé par e-mail.
     */
    public function store(Request $request)
    {
        $this->assertCanManageStaff($request);
        $owner = $request->user();
        $ownerId = $owner->hostScopeId();

        $data = $request->validate([
            'email' => 'required|email|max:255',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(HostStaff::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => [Rule::in(HostStaff::PERMISSIONS)],
        ]);

        // Si aucune sélection explicite n'est envoyée, on retombe sur la présélection du
        // poste plutôt que de laisser le collaborateur sans aucun menu accessible.
        $permissions = array_values(array_unique(
            $data['permissions'] ?? HostStaff::DEFAULT_PERMISSIONS_BY_ROLE[$data['role']] ?? []
        ));

        $existing = HostStaff::where('owner_id', $ownerId)->where('email', $data['email'])->first();
        if ($existing) {
            return response()->json(['message' => 'Ce collaborateur a déjà été invité.'], 422);
        }

        $existingUser = User::where('email', $data['email'])->first();

        // Un e-mail déjà associé à un compte hôte ou admin indépendant ne peut pas être
        // transformé en collaborateur : on éviterait sinon de faire perdre à ce compte
        // l'accès à ses propres établissements (hostScopeId() ne renverrait plus que
        // ceux du nouveau propriétaire).
        if ($existingUser && ($existingUser->isAdmin() || ($existingUser->isHost() && !$existingUser->isStaff()))) {
            return response()->json([
                'message' => "Cette adresse e-mail est déjà associée à un compte hôte ou administrateur indépendant. Utilisez une autre adresse.",
            ], 422);
        }
        if ($existingUser && $existingUser->isStaff() && (int) $existingUser->staff_owner_id !== (int) $ownerId) {
            return response()->json([
                'message' => "Cette adresse e-mail est déjà rattachée à un autre établissement.",
            ], 422);
        }

        $isImmediateLink = $existingUser && $existingUser->isStaff();

        $staff = HostStaff::create([
            'owner_id' => $ownerId,
            'collaborator_user_id' => $isImmediateLink ? $existingUser->id : null,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'permissions' => $permissions,
            'status' => $isImmediateLink ? HostStaff::STATUS_ACTIVE : HostStaff::STATUS_INVITED,
            'invited_at' => now(),
            'accepted_at' => $isImmediateLink ? now() : null,
            'invite_token' => $isImmediateLink ? null : Str::random(48),
        ]);

        if ($isImmediateLink) {
            // Compte déjà collaborateur de CE propriétaire (ex. réinvitation après suppression) :
            // liaison immédiate, pas d'e-mail d'activation nécessaire.
            $existingUser->update(['staff_role' => $data['role'], 'staff_permissions' => $permissions]);
        } else {
            // Nouvel e-mail, ou compte voyageur simple existant : on ne le convertit PAS
            // automatiquement en compte host — il doit poser un mot de passe collaborateur
            // dédié via le lien d'activation (même s'il a déjà un compte voyageur).
            $ownerLabel = $owner->company_name ?: $owner->name;
            $activationUrl = rtrim(config('services.frontend_url'), '/') . '/auth/activate-staff?token=' . $staff->invite_token;
            try {
                Mail::raw(
                    "Bonjour {$data['name']},\n\n"
                    . "{$ownerLabel} vous invite à rejoindre son espace bo séjour en tant que "
                    . (HostStaff::ROLE_LABELS[$data['role']] ?? $data['role']) . ".\n\n"
                    . "Activez votre accès en définissant votre mot de passe : {$activationUrl}\n\n"
                    . "Ce lien est personnel, ne le partagez pas.\n\nÀ bientôt,\nL'équipe bo séjour",
                    function ($message) use ($data) {
                        $message->to($data['email'])->subject('Invitation à rejoindre un espace bo séjour');
                    }
                );
            } catch (\Throwable $e) {
                Log::warning('Host staff invite email failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json($staff->fresh()->load('collaboratorUser:id,name,email,avatar'), 201);
    }

    public function update(Request $request, HostStaff $staffMember)
    {
        $this->assertCanManageStaff($request);
        if ($staffMember->owner_id !== $request->user()->hostScopeId()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => ['nullable', Rule::in(HostStaff::ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => [Rule::in(HostStaff::PERMISSIONS)],
            'status' => ['nullable', Rule::in([HostStaff::STATUS_ACTIVE, HostStaff::STATUS_SUSPENDED])],
        ]);

        // 'permissions' peut légitimement être un tableau vide (retirer tous les menus) —
        // array_filter(...,  fn($v) => $v !== null) le laisserait passer tel quel, mais il
        // faut le traiter à part puisque [] est "falsy" pour d'autres usages ailleurs.
        $hasPermissions = array_key_exists('permissions', $data) && $data['permissions'] !== null;
        $updates = array_filter($data, fn ($v) => $v !== null);
        if ($hasPermissions) {
            $updates['permissions'] = array_values(array_unique($data['permissions']));
        }

        $staffMember->update($updates);

        if ($staffMember->collaborator_user_id && (isset($data['role']) || $hasPermissions)) {
            $userUpdates = [];
            if (isset($data['role'])) $userUpdates['staff_role'] = $data['role'];
            if ($hasPermissions) $userUpdates['staff_permissions'] = $updates['permissions'];
            User::where('id', $staffMember->collaborator_user_id)->update($userUpdates);
        }

        return response()->json($staffMember->fresh()->load('collaboratorUser:id,name,email,avatar'));
    }

    public function destroy(Request $request, HostStaff $staffMember)
    {
        $this->assertCanManageStaff($request);
        if ($staffMember->owner_id !== $request->user()->hostScopeId()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        if ($staffMember->collaborator_user_id) {
            // Coupe l'accès immédiatement : le compte redevient un compte voyageur normal
            // (il a été promu 'host' uniquement au moment de l'activation collaborateur).
            User::where('id', $staffMember->collaborator_user_id)->update([
                'staff_owner_id' => null,
                'staff_role' => null,
                'role' => 'user',
            ]);
        }

        $staffMember->delete();

        return response()->json(['message' => 'Collaborateur retiré.']);
    }
}
