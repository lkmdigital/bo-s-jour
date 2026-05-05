<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    use HasFactory;

    /**
     * Si name est vide, afficher le type (plus de champ nom distinct).
     */
    protected function name(): Attribute
    {
        return Attribute::get(fn () => $this->attributes['name'] ?? $this->attributes['type'] ?? 'Chambre');
    }

    protected $fillable = [
        'accommodation_id',
        'name',
        'name_en',
        'type',
        'description',
        'description_en',
        'capacity',
        'price_per_night',
        'amenities',
        'bedrooms',
        'bathrooms',
        'is_active',
        'quantity', // Nombre total de chambres de ce type
        // Nouveaux champs système amélioré
        'room_category',
        'room_subcategory',
        'bedding',
        'bedding_custom',
        'surface_area',
        'bathroom_features',
        'has_guest_toilet',
        'has_additional_bathroom',
        'basic_amenities',
        'view_type',
        'view_price_modifier',
        'outdoor_features',
        'outdoor_area',
        'storage_options',
        'has_living_room',
        'living_room_features',
        'has_kitchen',
        'kitchen_type',
        'kitchen_equipment',
        'has_dining_area',
        'dining_capacity',
        'additional_bedrooms',
        'additional_bedrooms_config',
        'premium_amenities',
        'paid_options',
        'has_private_pool',
        'pool_heated',
        'has_parking',
        'parking_type',
        'parking_price',
        'is_pmr_accessible',
        'pmr_features',
        'single_occupancy_price',
        'extra_bed_price',
        'max_extra_beds',
        'custom_tags',
    ];

    protected function casts(): array
    {
        return [
            'amenities' => 'array',
            'price_per_night' => 'decimal:2',
            'single_occupancy_price' => 'decimal:2',
            'extra_bed_price' => 'decimal:2',
            'parking_price' => 'decimal:2',
            'surface_area' => 'decimal:2',
            'outdoor_area' => 'decimal:2',
            'is_active' => 'boolean',
            'has_guest_toilet' => 'boolean',
            'has_additional_bathroom' => 'boolean',
            'has_living_room' => 'boolean',
            'has_kitchen' => 'boolean',
            'has_dining_area' => 'boolean',
            'has_private_pool' => 'boolean',
            'pool_heated' => 'boolean',
            'has_parking' => 'boolean',
            'is_pmr_accessible' => 'boolean',
            // Champs JSON
            'bedding' => 'array',
            'bathroom_features' => 'array',
            'basic_amenities' => 'array',
            'outdoor_features' => 'array',
            'storage_options' => 'array',
            'living_room_features' => 'array',
            'kitchen_equipment' => 'array',
            'additional_bedrooms_config' => 'array',
            'premium_amenities' => 'array',
            'paid_options' => 'array',
            'pmr_features' => 'array',
            'custom_tags' => 'array',
        ];
    }

    public function accommodation()
    {
        return $this->belongsTo(Accommodation::class);
    }

    public function availabilities()
    {
        return $this->hasMany(RoomAvailability::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function isAvailableForDates($checkIn, $checkOut)
    {
        $dates = $this->getDatesBetween($checkIn, $checkOut);
        
        return $this->availabilities()
            ->whereIn('date', $dates)
            ->where('status', 'available')
            ->count() === count($dates);
    }

    private function getDatesBetween($start, $end)
    {
        $dates = [];
        $current = strtotime($start);
        $end = strtotime($end);

        while ($current < $end) {
            $dates[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        return $dates;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function promotions()
    {
        return $this->hasMany(Promotion::class);
    }

    public function activePromotions()
    {
        return $this->hasMany(Promotion::class)->where('is_active', true);
    }

    /**
     * Images de la chambre
     */
    public function images()
    {
        return $this->hasMany(RoomImage::class)->ordered();
    }

    /**
     * Image principale de la chambre
     */
    public function primaryImage()
    {
        return $this->hasOne(RoomImage::class)->primary();
    }

    /**
     * Vérifier si la chambre a le nombre minimum d'images
     */
    public function hasMinimumImages($min = 3)
    {
        return $this->images()->count() >= $min;
    }

    /**
     * Obtenir l'URL de l'image principale
     */
    public function getPrimaryImageUrlAttribute()
    {
        $primaryImage = $this->primaryImage;
        return $primaryImage ? $primaryImage->full_url : null;
    }

    /**
     * Calculer le prix avec le modificateur de vue
     */
    public function getAdjustedPriceAttribute()
    {
        $basePrice = $this->price_per_night;
        $modifier = $this->view_price_modifier ?? 0;
        
        return $basePrice + ($basePrice * $modifier / 100);
    }

    /**
     * Obtenir le prix pour occupation simple (si défini, sinon -15% du prix de base)
     */
    public function getSingleOccupancyPriceAttribute($value)
    {
        if ($value !== null) {
            return $value;
        }
        
        // Par défaut, -15% du prix de base
        return $this->price_per_night * 0.85;
    }

    /**
     * Vérifier si la chambre est accessible PMR
     */
    public function isPmrAccessible()
    {
        return $this->is_pmr_accessible || $this->room_category === 'pmr';
    }

    /**
     * Obtenir le label de la catégorie
     */
    public function getCategoryLabelAttribute()
    {
        $labels = [
            'single' => 'Chambre Single',
            'double' => 'Chambre Double',
            'twin' => 'Chambre Twin',
            'triple' => 'Chambre Triple',
            'pmr' => 'Chambre Accessible PMR',
            'suite' => 'Suite',
            'other' => 'Autre',
        ];

        return $labels[$this->room_category] ?? $this->type;
    }

    /**
     * Obtenir le label de la sous-catégorie
     */
    public function getSubcategoryLabelAttribute()
    {
        $labels = [
            'standard' => 'Standard',
            'confort' => 'Confort',
            'superieure' => 'Supérieure',
            'deluxe' => 'Deluxe',
            'premium' => 'Premium',
            'junior' => 'Junior',
            'familiale' => 'Familiale',
            'executive' => 'Executive',
            'studio' => 'Studio',
            'appartement' => 'Appartement',
            'bungalow' => 'Bungalow',
            'villa' => 'Villa',
        ];

        return $labels[$this->room_subcategory] ?? '';
    }

    /**
     * Obtenir le nom complet (catégorie + sous-catégorie + nom)
     */
    public function getFullNameAttribute()
    {
        $parts = [];
        
        if ($this->category_label) {
            $parts[] = $this->category_label;
        }
        
        if ($this->subcategory_label) {
            $parts[] = $this->subcategory_label;
        }
        
        if ($this->name) {
            $parts[] = $this->name;
        }
        
        return implode(' - ', array_filter($parts));
    }
}
