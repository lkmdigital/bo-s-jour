<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    /**
     * Critères de notation par catégorie (1 à 5 étoiles), tous facultatifs.
     * Le client peut noter tout ou partie de ces critères en plus de la note globale.
     */
    public const CATEGORIES = [
        'staff' => 'Personnel',
        'cleanliness' => 'Propreté',
        'comfort' => 'Confort',
        'breakfast' => 'Petits déjeuners',
        'wifi' => 'Wifi',
        'accessibility' => 'Accessibilité',
        'shuttle' => 'Navette',
        'activities' => 'Autres activités',
        'value_for_money' => 'Rapport qualité-prix',
        'restaurant' => 'Restaurant',
    ];

    protected $fillable = [
        'user_id',
        'accommodation_id',
        'rating',
        'category_ratings',
        'comment',
        'comment_en',
        'host_reply',
        'host_replied_at',
        'is_reported',
        'report_reason',
        'report_count',
        'reported_by',
        'moderation_status',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'category_ratings' => 'array',
            'host_replied_at' => 'datetime',
            'is_reported' => 'boolean',
            'reported_by' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function accommodation()
    {
        return $this->belongsTo(Accommodation::class);
    }
}

