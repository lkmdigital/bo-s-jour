<?php

namespace App\Policies;

use App\Models\User;

/**
 * Policy pour la gestion des hôtes
 */
class HostPolicy
{
    /**
     * Déterminer si l'utilisateur peut voir n'importe quel hôte
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('hosts.read') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut voir un hôte spécifique
     */
    public function view(User $user, User $host): bool
    {
        // Un hôte peut voir son propre profil
        if ($user->id === $host->id) {
            return true;
        }

        return $user->hasPermission('hosts.read') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut valider un hôte
     */
    public function validate(User $user, User $host): bool
    {
        return $user->isAdmin() ||
               $user->hasPermission('hosts.validate') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut rejeter un hôte
     */
    public function reject(User $user, User $host): bool
    {
        return $user->isAdmin() ||
               $user->hasPermission('hosts.reject') || 
               $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut suspendre un hôte
     */
    public function suspend(User $user, User $host): bool
    {
        return $user->isAdmin() ||
               $user->hasPermission('hosts.suspend') || 
               $user->hasAnyRole(['super_admin', 'admin']);
    }

    /**
     * Déterminer si l'utilisateur peut retirer le statut hôte
     */
    public function removeHostStatus(User $user, User $host): bool
    {
        return $user->isAdmin() ||
               $user->hasPermission('hosts.remove_status') || 
               $user->hasRole('super_admin');
    }

    /**
     * Déterminer si l'utilisateur peut voir les notes internes
     */
    public function viewInternalNotes(User $user, User $host): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }

    /**
     * Déterminer si l'utilisateur peut créer des notes internes
     */
    public function createInternalNotes(User $user, User $host): bool
    {
        return $user->hasAnyRole(['super_admin', 'admin', 'gerant']);
    }
}

