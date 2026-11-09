<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Un filleul rattaché à un ambassadeur, avec l'avancement des deux paliers de points. */
class ReferralPartnerReferral extends Model
{
    protected $fillable = [
        'referral_partner_id', 'user_id', 'signup_validated_at', 'signup_points',
        'first_booking_id', 'first_booking_at', 'booking_points',
    ];

    protected function casts(): array
    {
        return [
            'signup_validated_at' => 'datetime',
            'first_booking_at' => 'datetime',
            'signup_points' => 'integer',
            'booking_points' => 'integer',
        ];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(ReferralPartner::class, 'referral_partner_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
