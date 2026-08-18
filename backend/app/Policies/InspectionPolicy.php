<?php

namespace App\Policies;

use App\Models\Inspection;
use App\Models\User;

/**
 * Policy pour la gestion des inspections
 */
class InspectionPolicy
{
    /**
     * Déterminer si l'utilisateur peut voir n'importe quelle inspection
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('inspections.read') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant', 'controleur']);
    }

    /**
     * Déterminer si l'utilisateur peut voir une inspection spécifique
     */
    public function view(User $user, Inspection $inspection): bool
    {
        // Le contrôleur peut voir ses propres inspections
        if ($inspection->inspector_id === $user->id) {
            return true;
        }

        return $user->hasPermission('inspections.read') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut créer une inspection
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('inspections.create') || 
               $user->hasRole('controleur');
    }

    /**
     * Déterminer si l'utilisateur peut mettre à jour une inspection
     */
    public function update(User $user, Inspection $inspection): bool
    {
        // Le contrôleur peut mettre à jour ses propres inspections en cours
        if ($inspection->inspector_id === $user->id && 
            in_array($inspection->status, ['scheduled', 'in_progress'])) {
            return true;
        }

        return $user->hasPermission('inspections.update') || 
               $user->hasAnyRole(['super_admin', 'admin']);
    }

    /**
     * Déterminer si l'utilisateur peut compléter une inspection
     */
    public function complete(User $user, Inspection $inspection): bool
    {
        // Même schéma que update() ci-dessus : l'inspecteur assigné peut compléter
        // sa propre inspection quel que soit son rôle (store() autorise déjà un
        // admin à devenir inspector_id via inspections.create — l'ancienne
        // condition hasRole('controleur') rendait alors l'inspection à jamais
        // impossible à compléter par qui que ce soit) ; un admin garde par
        // ailleurs la même capacité de reprise en main que sur update().
        if ($inspection->inspector_id === $user->id) {
            return true;
        }

        return $user->hasPermission('inspections.update') ||
               $user->hasAnyRole(['super_admin', 'admin']);
    }

    /**
     * Déterminer si l'utilisateur peut approuver une inspection
     */
    public function approve(User $user, Inspection $inspection): bool
    {
        return $user->hasPermission('inspections.approve') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut rejeter une inspection
     */
    public function reject(User $user, Inspection $inspection): bool
    {
        return $user->hasPermission('inspections.reject') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }
}

