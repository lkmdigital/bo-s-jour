<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Accommodation extends Model
{
    use HasFactory;

    protected $fillable = [
        'host_id',
        'name',
        'slug',
        'type',
        'description',
        'description_en',
        'address',
        'city',
        'latitude',
        'longitude',
        'price_per_night',
        'max_guests',
        'bedrooms',
        'bathrooms',
        'amenities',
        'status',
        'is_featured',
        'rating',
        'total_reviews',
        // Nouveaux champs
        'opening_year',
        'star_rating',
        'standing',
        'room_types',
        'room_type_pricing',
        'conference_rooms_count',
        'conference_capacity',
        'restaurant_capacity',
        'bar_capacity',
        'shuttle_service',
        'laundry',
        'breakfast_price',
        'reception_24h',
        'smoking_area',
        'pets_allowed',
        'other_amenities',
        'deposit_required',
        'deposit_amount',
        'cancellation_policy_hours',
        'payment_methods',
        'special_conditions',
        'breakfast_included',
        'breakfast_included_persons',
        'check_in_time',
        'check_out_time',
        'invoice_paid_before_hours',
        // Tarification : chaque plan est une option à cocher par l'hôte
        'pricing_auto_enabled',
        'pricing_non_refundable_enabled',
        'pricing_non_refundable_discount',
        'pricing_modifiable_enabled',
        'pricing_modifiable_surcharge',
        'pricing_long_stay_enabled',
        'pricing_long_stay_discount',
        'pricing_long_stay_nights',
    ];

    protected function casts(): array
    {
        return [
            'amenities' => 'array',
            'room_types' => 'array',
            'room_type_pricing' => 'array',
            'payment_methods' => 'array',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'price_per_night' => 'decimal:2',
            'breakfast_price' => 'decimal:2',
            'is_featured' => 'boolean',
            'rating' => 'decimal:2',
            'shuttle_service' => 'boolean',
            'laundry' => 'boolean',
            'reception_24h' => 'boolean',
            'smoking_area' => 'boolean',
            'pets_allowed' => 'boolean',
            'deposit_required' => 'boolean',
            'breakfast_included' => 'boolean',
            'pricing_auto_enabled' => 'boolean',
            'pricing_non_refundable_enabled' => 'boolean',
            'pricing_modifiable_enabled' => 'boolean',
            'pricing_long_stay_enabled' => 'boolean',
            'pricing_non_refundable_discount' => 'decimal:2',
            'pricing_modifiable_surcharge' => 'decimal:2',
            'pricing_long_stay_discount' => 'decimal:2',
        ];
    }

    public function host()
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function images()
    {
        return $this->hasMany(AccommodationImage::class);
    }

    public function rooms()
    {
        return $this->hasMany(Room::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')
            ->where('expires_at', '>=', now());
    }

    public function promotions()
    {
        return $this->hasMany(Promotion::class);
    }

    public function activePromotions()
    {
        return $this->hasMany(Promotion::class)->where('is_active', true);
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeByCity($query, $city)
    {
        return $query->where('city', $city);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopePriceRange($query, $min, $max)
    {
        return $query->whereBetween('price_per_night', [$min, $max]);
    }

    /**
     * Historique des modifications (audit logs)
     */
    public function auditLogs()
    {
        return $this->hasMany(AccommodationAuditLog::class);
    }

    /**
     * Notes internes admin
     */
    public function adminNotes()
    {
        return $this->morphMany(AdminNote::class, 'noteable');
    }

    /**
     * Inspections effectuées sur cet établissement
     */
    public function inspections()
    {
        return $this->hasMany(Inspection::class);
    }
}

