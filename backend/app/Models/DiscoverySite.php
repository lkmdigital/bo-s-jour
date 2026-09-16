<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DiscoverySite extends Model
{
    protected $fillable = [
        'name',
        'city',
        'categories',
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
