<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CorporateRewardTier extends Model
{
    use HasFactory;

    protected $fillable = ['revenue_threshold', 'reward_label', 'active', 'sort_order'];

    protected function casts(): array
    {
        return [
            'revenue_threshold' => 'decimal:2',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function annualRewards()
    {
        return $this->hasMany(CorporateAnnualReward::class, 'reward_tier_id');
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
