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
        'permissions',
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
            'permissions' => 'array',
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

    // Menus de l'extranet partenaire pouvant être cochés individuellement pour un
    // collaborateur — "Tableau de bord" n'y figure pas : toujours accessible, c'est la
    // page d'atterrissage. Miroir de NAV_ITEMS dans HostSidebar.tsx (frontend).
    public const PERMISSIONS = [
        'property', 'rooms', 'calendar', 'reservations', 'clients', 'reviews',
        'promotions', 'finances', 'documents', 'staff', 'marketing', 'stats', 'ai',
    ];

    public const PERMISSION_LABELS = [
        'property' => 'Mes établissements',
        'rooms' => 'Chambres et tarifs',
        'calendar' => 'Calendrier',
        'reservations' => 'Réservations',
        'clients' => 'Clients',
        'reviews' => 'Avis',
        'promotions' => 'Promotions',
        'finances' => 'Finances',
        'documents' => 'Documents',
        'staff' => 'Personnel',
        'marketing' => 'Commercialisation',
        'stats' => 'Statistiques',
        'ai' => 'Assistant IA',
    ];

    // Présélection suggérée à l'invitation selon le poste — reste entièrement modifiable
    // via les cases à cocher, ce n'est qu'un point de départ pratique.
    public const DEFAULT_PERMISSIONS_BY_ROLE = [
        'administrateur' => ['property', 'rooms', 'calendar', 'reservations', 'clients', 'reviews', 'promotions', 'finances', 'documents', 'staff', 'marketing', 'stats', 'ai'],
        'receptionniste' => ['calendar', 'reservations', 'clients'],
        'comptabilite' => ['finances', 'documents', 'stats'],
        'commercial' => ['promotions', 'marketing', 'reviews', 'stats'],
        'housekeeping' => ['calendar', 'rooms', 'reservations'],
        'maintenance' => ['rooms', 'property'],
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
