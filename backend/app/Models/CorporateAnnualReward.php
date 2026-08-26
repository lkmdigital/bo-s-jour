<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CorporateAnnualReward extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'year',
        'revenue_total',
        'reward_tier_id',
        'reward_label',
        'computed_at',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'revenue_total' => 'decimal:2',
            'computed_at' => 'datetime',
        ];
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function rewardTier()
    {
        return $this->belongsTo(CorporateRewardTier::class, 'reward_tier_id');
    }
}
