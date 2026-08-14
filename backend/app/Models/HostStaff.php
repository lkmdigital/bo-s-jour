<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Collaborateur autorisé à opérer sur les établissements d'un hôte
 * (brief Extranet Partenaire, Phase 13 — Gestion des utilisateurs).
 */
class HostStaff extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'collaborator_user_id',
        'name',
        'email',
        'phone',
        'role',
        'status',
        'invited_at',
        'accepted_at',
        'invite_token',
    ];

    // Jeton d'activation : ne doit jamais être exposé dans les réponses JSON
    // (seul l'e-mail envoyé au collaborateur le contient).
    protected $hidden = ['invite_token'];

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public const STATUS_INVITED = 'invited';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    public const ROLES = ['administrateur', 'receptionniste', 'comptabilite', 'commercial', 'housekeeping', 'maintenance'];

    public const ROLE_LABELS = [
        'administrateur' => 'Administrateur',
        'receptionniste' => 'Réceptionniste',
        'comptabilite' => 'Comptabilité',
        'commercial' => 'Commercial',
        'housekeeping' => 'Housekeeping',
        'maintenance' => 'Maintenance',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function collaboratorUser()
    {
        return $this->belongsTo(User::class, 'collaborator_user_id');
    }
}
