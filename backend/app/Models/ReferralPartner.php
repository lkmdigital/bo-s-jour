<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Ambassadeur externe : un membre qui recrute des clients via son QR code / lien traçable. */
class ReferralPartner extends Model
{
    protected $fillable = ['user_id', 'code', 'display_name', 'is_active', 'created_by_user_id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(ReferralPartnerClick::class);
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(ReferralPartnerReferral::class);
    }
}
