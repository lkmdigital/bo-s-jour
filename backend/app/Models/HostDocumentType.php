<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Type de document que l'établissement doit fournir (Paramètres > Documents).
 * Obligatoire ou facultatif ; seuls les obligatoires pèsent sur la conformité.
 */
class HostDocumentType extends Model
{
    use SoftDeletes;

    private const CACHE_KEY = 'host_document_types.active';

    protected $fillable = ['key', 'label', 'description', 'is_required', 'is_active', 'sort_order', 'legacy_column'];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
        static::restored(fn () => Cache::forget(self::CACHE_KEY));
    }

    /** Types actifs, mis en cache : lus pour chaque hôte lors des calculs de conformité. */
    public static function active(): Collection
    {
        return Cache::remember(self::CACHE_KEY, 300, fn () => static::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get());
    }

    public function documents()
    {
        return $this->hasMany(HostDocument::class);
    }
}
