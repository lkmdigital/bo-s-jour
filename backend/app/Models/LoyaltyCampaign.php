<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'type', 'multiplier', 'bonus_points', 'starts_at', 'ends_at', 'active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'multiplier' => 'decimal:2',
            'bonus_points' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeCurrentlyActive($query)
    {
        return $query->where('active', true)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now());
    }

    public function isCurrentlyActive(): bool
    {
        return $this->active && now()->between($this->starts_at, $this->ends_at);
    }
}
