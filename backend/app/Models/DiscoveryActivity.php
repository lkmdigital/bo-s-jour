<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DiscoveryActivity extends Model
{
    protected $fillable = [
        'name',
        'categories',
        'search_term',
        'image_path',
        'display_order',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'categories' => 'array',
            'is_published' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
