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
