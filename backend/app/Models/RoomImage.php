<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class RoomImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'image_path',
        'thumbnail_path',
        'is_primary',
        'sort_order',
        'caption',
        'caption_en',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected $appends = ['full_url', 'thumbnail_url'];

    /**
     * Relation avec la chambre
     */
    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Obtenir l'URL complète de l'image
     */
    public function getFullUrlAttribute()
    {
        if (!$this->image_path) {
            return null;
        }

        // Si l'URL est déjà complète (commence par http/https), la retourner telle quelle
        if (preg_match('/^https?:\/\//', $this->image_path)) {
            return $this->image_path;
        }

        // Sinon, générer l'URL complète (pour compatibilité anciennes données)
        $baseUrl = rtrim(config('app.url'), '/');
        $path = ltrim($this->image_path, '/');
        
        if (!str_starts_with($path, 'storage/')) {
            $path = 'storage/' . $path;
        }
        
        return $baseUrl . '/' . $path;
    }

    /**
     * Obtenir l'URL de la miniature
     */
    public function getThumbnailUrlAttribute()
    {
        if (!$this->thumbnail_path) {
            return $this->full_url; // Utiliser l'image principale si pas de miniature
        }

        // Si l'URL est déjà complète, la retourner telle quelle
        if (preg_match('/^https?:\/\//', $this->thumbnail_path)) {
            return $this->thumbnail_path;
        }

        // Sinon, générer l'URL complète (pour compatibilité)
        $baseUrl = rtrim(config('app.url'), '/');
        $path = ltrim($this->thumbnail_path, '/');
        
        if (!str_starts_with($path, 'storage/')) {
            $path = 'storage/' . $path;
        }
        
        return $baseUrl . '/' . $path;
    }

    /**
     * Scope pour les images triées
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('created_at');
    }

    /**
     * Scope pour l'image principale
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }
}
