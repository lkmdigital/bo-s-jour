<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role', // Rôle principal (rétrocompatibilité)
        'staff_owner_id',
        'staff_role',
        'staff_permissions',
        'avatar',
        'email_verified_at',
        'google_id',
        'microsoft_id',
        'oauth_provider',
        'date_of_birth',
        'bio',
        'address_line1',
        'address_line2',
        'city',
        'postal_code',
        'country',
        'id_type',
        'id_number',
        'id_document_path',
        'id_document_recto_path',
        'id_document_verso_path',
        'proof_of_address_path',
        'business_license_path',
        'rccm_document_path',
        'tax_document_path',
        'profile_completed',
        'profile_verified',
        'profile_verified_at',
        'verification_notes',
        'is_guest', // Compte auto-créé lors d'une réservation invité (à activer)
        'activation_reminder_stage', // Étape de relance d'activation (0..3)
        // Profil voyageur (brief Parcours Voyageur)
        'first_name',
        'last_name',
        'residence_country',
        'residence_city',
        'nationality',
        'traveler_type',
        'company_name',
        'company_vat',
        'company_address',
        'company_city',
        'company_country',
        'company_service',
        'company_project',
        'company_billing_email',
        // Complétion du profil (brief Phase 5)
        'gender',
        'profession',
        'preferred_language',
        'region',
        'commune',
        'preferred_accommodation_type',
        'average_budget',
        'interests',
        'travel_frequency',
        'travel_purpose',
        'notif_email',
        'notif_whatsapp',
        'notif_sms',
        'offer_types',
        // Champs spécifiques aux hôtes
        'establishment_name',
        'accommodation_type',
        'phone_fixed',
        'whatsapp',
        'website',
        'facebook_page',
        'rccm',
        'cnps_number',
        'tax_account_number',
        // Coordonnées bancaires (reversements hôte)
        'bank_name',
        'bank_account_holder',
        'bank_account_number',
        // Nouveaux champs de gestion
        'status',
        'blocked_at',
        'blocked_by',
        'block_reason',
        'last_login_at',
        'last_login_ip',
        'login_count',
        // Champs 2FA
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_enabled_at',
        // Champs OTP email
        'email_otp_code',
        'email_otp_expires_at',
        // Programme de fidélité
        'loyalty_points_lifetime',
        'loyalty_points_balance',
        'loyalty_tier',
        'referral_code',
        'referred_by_user_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'email_otp_code',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'blocked_at' => 'datetime',
            'last_login_at' => 'datetime',
            'login_count' => 'integer',
            'two_factor_enabled' => 'boolean',
            'is_guest' => 'boolean',
            'two_factor_enabled_at' => 'datetime',
            'email_otp_expires_at' => 'datetime',
            // Profil (complétion Phase 5)
            'date_of_birth' => 'date',
            'interests' => 'array',
            'offer_types' => 'array',
            'average_budget' => 'integer',
            'notif_email' => 'boolean',
            'notif_whatsapp' => 'boolean',
            'notif_sms' => 'boolean',
            'staff_permissions' => 'array',
            // Programme de fidélité
            'loyalty_points_lifetime' => 'integer',
            'loyalty_points_balance' => 'integer',
        ];
    }

    public function hasBankDetails(): bool
    {
        return !empty($this->bank_name) && !empty($this->bank_account_holder) && !empty($this->bank_account_number);
    }

    public function staffOwner()
    {
        return $this->belongsTo(User::class, 'staff_owner_id');
    }

    public function staffMembers()
    {
        return $this->hasMany(HostStaff::class, 'owner_id');
    }

    public function isStaff(): bool
    {
        return !empty($this->staff_owner_id);
    }

    /**
     * Identifiant "propriétaire" à utiliser pour toute requête host_id : le compte
     * lui-même s'il est propriétaire, ou son staff_owner_id s'il s'agit d'un
     * collaborateur (réceptionniste, comptabilité…) — brief Extranet Partenaire,
     * Phase 13. Les modules réellement accessibles restent filtrés côté menu
     * (voir HostStaff::ROLE_LABELS / frontend) : ceci ne fait que garantir qu'un
     * collaborateur ne voit et n'agit jamais que sur les établissements de SON
     * propriétaire, jamais sur ceux d'un autre hôte.
     */
    public function hostScopeId(): int
    {
        return $this->staff_owner_id ?? $this->id;
    }

    /**
     * Menus de l'extranet partenaire auxquels ce collaborateur a droit (clés
     * HostStaff::PERMISSIONS), cochés individuellement par le propriétaire à
     * l'invitation. Un administrateur sans liste explicite (comptes activés avant
     * l'introduction des cases à cocher) garde un accès complet par défaut ; les
     * autres postes sans liste explicite n'ont accès qu'au tableau de bord.
     */
    public function staffPermissions(): array
    {
        if (is_array($this->staff_permissions)) {
            return $this->staff_permissions;
        }
        return $this->staff_role === 'administrateur' ? HostStaff::PERMISSIONS : [];
    }

    public function hasCompleteIdentityDocument(): bool
    {
        $hasSingle = !empty($this->id_document_path);
        $hasRectoVerso = !empty($this->id_document_recto_path) && !empty($this->id_document_verso_path);

        return $hasSingle || $hasRectoVerso;
    }

    public function getComplianceRequirementsAttribute(): array
    {
        $checks = [
            'manager_id_document' => [
                'label' => 'Pièce du gérant',
                'ok' => $this->hasCompleteIdentityDocument(),
            ],
            'manager_id_number' => [
                'label' => 'Numéro de pièce du gérant',
                'ok' => !empty($this->id_number),
            ],
            'establishment_number' => [
                'label' => 'Numéro de l\'établissement',
                'ok' => !empty($this->phone_fixed),
            ],
            'establishment_whatsapp' => [
                'label' => 'WhatsApp de l\'établissement',
                'ok' => !empty($this->whatsapp),
            ],
            'rccm_number' => [
                'label' => 'Numéro RCM',
                'ok' => !empty($this->rccm),
            ],
            'tax_number' => [
                'label' => 'Numéro contribuable',
                'ok' => !empty($this->tax_account_number),
            ],
            'rccm_document' => [
                'label' => 'Document RCM',
                'ok' => !empty($this->rccm_document_path),
            ],
            'operating_license_document' => [
                'label' => 'Licence d\'exploitation',
                'ok' => !empty($this->business_license_path),
            ],
            'tax_document' => [
                'label' => 'Document contribuable',
                'ok' => !empty($this->tax_document_path),
            ],
        ];

        return $checks;
    }

    public function getComplianceStatusAttribute(): string
    {
        $checks = $this->compliance_requirements;
        foreach ($checks as $check) {
            if (empty($check['ok'])) {
                return 'non_conforme';
            }
        }

        return 'conforme';
    }

    public function accommodations()
    {
        return $this->hasMany(Accommodation::class, 'host_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function favorites()
    {
        return $this->hasMany(Favorite::class);
    }

    public function favoriteAccommodations()
    {
        return $this->belongsToMany(Accommodation::class, 'favorites')->withTimestamps();
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscriptions()
    {
        return $this->hasMany(Subscription::class)
            ->where('status', 'active')
            ->where('expires_at', '>=', now());
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isHost(): bool
    {
        return $this->role === 'host';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    /**
     * Rôles RBAC (relation many-to-many)
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user')
            ->withPivot('assigned_by', 'assigned_at', 'expires_at')
            ->withTimestamps();
    }

    /**
     * Permissions via les rôles
     */
    public function permissions()
    {
        return $this->roles()
            ->with('permissions')
            ->get()
            ->pluck('permissions')
            ->flatten()
            ->unique('id');
    }

    /**
     * Vérifier si l'utilisateur a un rôle spécifique
     */
    public function hasRole(string $roleName): bool
    {
        // Vérifier d'abord le rôle principal (rétrocompatibilité)
        if ($this->role === $roleName) {
            return true;
        }

        // Vérifier les rôles RBAC
        return $this->roles()
            ->where('name', $roleName)
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->exists();
    }

    /**
     * Vérifier si l'utilisateur a une permission spécifique
     */
    public function hasPermission(string $permissionName): bool
    {
        // Super admin a toutes les permissions
        if ($this->hasRole('super_admin')) {
            return true;
        }

        // Admin legacy (role = 'admin') a toutes les permissions (rétrocompatibilité)
        if ($this->role === 'admin') {
            return true;
        }

        return $this->roles()
            ->whereHas('permissions', function ($query) use ($permissionName) {
                $query->where('name', $permissionName)
                    ->where('active', true);
            })
            ->where('active', true)
            ->exists();
    }

    /**
     * Vérifier si l'utilisateur a au moins un des rôles
     */
    public function hasAnyRole(array $roleNames): bool
    {
        foreach ($roleNames as $roleName) {
            if ($this->hasRole($roleName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Vérifier si l'utilisateur est actif et non bloqué
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && $this->blocked_at === null;
    }

    /**
     * Blocage de l'utilisateur
     */
    public function block(?int $blockedBy = null, ?string $reason = null): void
    {
        $this->update([
            'status' => 'blocked',
            'blocked_at' => now(),
            'blocked_by' => $blockedBy,
            'block_reason' => $reason,
        ]);
    }

    /**
     * Déblocage de l'utilisateur
     */
    public function unblock(): void
    {
        $this->update([
            'status' => 'active',
            'blocked_at' => null,
            'blocked_by' => null,
            'block_reason' => null,
        ]);
    }

    /**
     * Historique des activités
     */
    public function activityLogs()
    {
        return $this->hasMany(UserActivityLog::class);
    }

    /**
     * Notes admin (si l'utilisateur est un hôte)
     */
    public function adminNotes()
    {
        return $this->morphMany(AdminNote::class, 'noteable');
    }

    /**
     * Historique de validation (si hôte)
     */
    public function hostValidationHistory()
    {
        return $this->hasMany(HostValidationHistory::class, 'host_id');
    }

    /**
     * Inspections effectuées (si contrôleur)
     */
    public function inspections()
    {
        return $this->hasMany(Inspection::class, 'inspector_id');
    }

    /**
     * Utilisateur qui a bloqué cet utilisateur
     */
    public function blockedByUser()
    {
        return $this->belongsTo(User::class, 'blocked_by');
    }

    /**
     * Programme de fidélité — grand livre des mouvements de points
     */
    public function loyaltyPointsTransactions()
    {
        return $this->hasMany(LoyaltyPointsTransaction::class);
    }

    /**
     * Programme de fidélité — bons émis pour cet utilisateur
     */
    public function loyaltyVouchers()
    {
        return $this->hasMany(LoyaltyVoucher::class);
    }

    /**
     * Filleul → parrain (l'utilisateur qui a fourni le code de parrainage utilisé)
     */
    public function referredBy()
    {
        return $this->belongsTo(User::class, 'referred_by_user_id');
    }

    /**
     * Parrain → filleuls (utilisateurs inscrits avec le code de parrainage de cet utilisateur)
     */
    public function referredUsers()
    {
        return $this->hasMany(User::class, 'referred_by_user_id');
    }
}

