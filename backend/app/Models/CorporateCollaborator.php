<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Un collaborateur autorisé à réserver au nom de l'entreprise d'un voyageur Corporate
 * (brief Parcours Voyageur, Étape 22 — Gestion des collaborateurs Corporate).
 */
class CorporateCollaborator extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'collaborator_user_id',
        'email',
        'name',
        'department',
        'spending_limit',
        'status',
        'invited_at',
        'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'spending_limit' => 'decimal:2',
            'invited_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public const STATUS_INVITED = 'invited';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function collaboratorUser()
    {
        return $this->belongsTo(User::class, 'collaborator_user_id');
    }

    /**
     * Deux utilisateurs appartiennent-ils au même compte entreprise (retour
     * client 2026-09-15 : messagerie "membre à membre" limitée au responsable
     * et à ses collaborateurs actifs, entre eux) ? Vrai si l'un est le
     * responsable de l'autre, ou si les deux sont collaborateurs actifs du
     * même responsable.
     */
    public static function areTeammates(int $userIdA, int $userIdB): bool
    {
        if ($userIdA === $userIdB) {
            return false;
        }

        $isDirectPair = self::where('status', self::STATUS_ACTIVE)
            ->where(function ($q) use ($userIdA, $userIdB) {
                $q->where(['owner_id' => $userIdA, 'collaborator_user_id' => $userIdB])
                  ->orWhere(['owner_id' => $userIdB, 'collaborator_user_id' => $userIdA]);
            })
            ->exists();

        if ($isDirectPair) {
            return true;
        }

        $ownerIdOfA = self::where('collaborator_user_id', $userIdA)->where('status', self::STATUS_ACTIVE)->value('owner_id');
        $ownerIdOfB = self::where('collaborator_user_id', $userIdB)->where('status', self::STATUS_ACTIVE)->value('owner_id');

        return $ownerIdOfA !== null && $ownerIdOfA === $ownerIdOfB;
    }

    /**
     * Rattache automatiquement les invitations en attente à ce compte, dès que son e-mail
     * correspond (inscription classique, inscription voyageur légère, ou activation d'un
     * compte invité). Appelé depuis AuthController.
     */
    public static function linkPendingInvitations(User $user): void
    {
        if (!$user->email) {
            return;
        }

        self::where('email', $user->email)
            ->where('status', self::STATUS_INVITED)
            ->whereNull('collaborator_user_id')
            ->update([
                'collaborator_user_id' => $user->id,
                'status' => self::STATUS_ACTIVE,
                'accepted_at' => now(),
            ]);
    }
}
