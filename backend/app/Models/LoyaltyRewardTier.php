<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyRewardTier extends Model
{
    use HasFactory;

    protected $fillable = ['points_required', 'discount_percent', 'active', 'sort_order'];

    protected function casts(): array
    {
        return [
            'points_required' => 'integer',
            'discount_percent' => 'decimal:2',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function vouchers()
    {
        return $this->hasMany(LoyaltyVoucher::class, 'reward_tier_id');
    }

    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }
}
