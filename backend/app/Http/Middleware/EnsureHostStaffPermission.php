<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie qu'un collaborateur hôte (staff_owner_id renseigné) a le menu correspondant
 * coché dans ses permissions (User::staffPermissions(), clés HostStaff::PERMISSIONS).
 *
 * Le PROPRIÉTAIRE (staff_owner_id vide) passe toujours, quel que soit le paramètre —
 * cette vérification ne s'applique qu'aux comptes collaborateurs invités.
 *
 * Introduit le 2026-08-31 : jusqu'ici, les cases à cocher de permissions
 * (host_staff.permissions / users.staff_permissions) n'étaient vérifiées côté serveur que
 * sur 2 endpoints (gestion du personnel, retraits) — partout ailleurs, un collaborateur
 * invité pour un seul poste (ex. "ménage") pouvait appeler directement l'API pour agir sur
 * n'importe quel module (tarifs, suppression d'établissement, finances...), la case à
 * cocher n'étant qu'un filtre d'affichage côté menu (HostSidebar.tsx).
 */
class EnsureHostStaffPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user || !$user->isStaff()) {
            return $next($request);
        }

        if (!in_array($permission, $user->staffPermissions(), true)) {
            return response()->json([
                'message' => "Vous n'avez pas accès à ce module. Contactez le propriétaire de l'établissement pour en demander l'accès.",
            ], 403);
        }

        return $next($request);
    }
}
