<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Un filleul rattaché à un ambassadeur, avec l'avancement des deux paliers de points. */
class ReferralPartnerReferral extends Model
{
    protected $fillable = [
        'referral_partner_id', 'user_id', 'signup_validated_at', 'signup_points', 'signup_credited_at',
        'first_booking_id', 'first_booking_at', 'booking_points', 'booking_credited_at',
        'discount_state', 'discount_booking_id',
    ];

    /** Même valeur que la colonne : une ligne créée à la volée (code saisi à la réservation) doit l'avoir en mémoire. */
    protected $attributes = ['discount_state' => 'available'];

    protected function casts(): array
    {
        return [
            'signup_validated_at' => 'datetime',
            'signup_credited_at' => 'datetime',
            'booking_credited_at' => 'datetime',
            'first_booking_at' => 'datetime',
            'signup_points' => 'integer',
            'booking_points' => 'integer',
        ];
    }

    public const DISCOUNT_AVAILABLE = 'available';
    public const DISCOUNT_RESERVED = 'reserved';
    public const DISCOUNT_USED = 'used';
    public const DISCOUNT_FORFEITED = 'forfeited';

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ReferralPartner::class, 'referral_partner_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
