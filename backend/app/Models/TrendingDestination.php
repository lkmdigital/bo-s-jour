<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TrendingDestination extends Model
{
    protected $fillable = [
        'city',
        'image_path',
        'from_price',
        'accommodations_count',
        'categories',
        'display_order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'categories' => 'array',
            'is_published' => 'boolean',
            'display_order' => 'integer',
            'from_price' => 'integer',
            'accommodations_count' => 'integer',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
