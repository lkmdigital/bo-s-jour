<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Promotion extends Model
{
    use HasFactory;

    protected $fillable = [
        'accommodation_id',
        'room_id',
        'discount_percent',
        'start_date',
        'end_date',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function accommodation()
    {
        return $this->belongsTo(Accommodation::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Vérifie si la promotion est actuellement active
     */
    public function isCurrentlyActive(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $today = Carbon::today();
        return $today >= $this->start_date && $today <= $this->end_date;
    }

    /**
     * Vérifie si la promotion est valide pour une date donnée
     */
    public function isValidForDate($date): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $checkDate = Carbon::parse($date);
        return $checkDate >= $this->start_date && $checkDate <= $this->end_date;
    }

    /**
     * Vérifie si la promotion est valide pour une période donnée
     */
    public function isValidForPeriod($checkIn, $checkOut): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);

        // La promotion doit chevaucher au moins partiellement la période demandée
        return $checkInDate <= $this->end_date && $checkOutDate >= $this->start_date;
    }

    /**
     * Scope pour les promotions actives
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour les promotions valides à une date donnée
     */
    public function scopeValidForDate($query, $date)
    {
        $checkDate = Carbon::parse($date);
        return $query->where('is_active', true)
            ->where('start_date', '<=', $checkDate)
            ->where('end_date', '>=', $checkDate);
    }

    /**
     * Scope pour les promotions valides pour une période
     */
    public function scopeValidForPeriod($query, $checkIn, $checkOut)
    {
        $checkInDate = Carbon::parse($checkIn);
        $checkOutDate = Carbon::parse($checkOut);
        
        return $query->where('is_active', true)
            ->where(function($q) use ($checkInDate, $checkOutDate) {
                $q->where(function($q2) use ($checkInDate, $checkOutDate) {
                    // La promotion commence avant ou pendant la période
                    $q2->where('start_date', '<=', $checkOutDate)
                       ->where('end_date', '>=', $checkInDate);
                });
            });
    }
}







