<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomPricePeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'label',
        'start_date',
        'end_date',
        'price_per_night',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'price_per_night' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOverlapping($query, $startDate, $endDate)
    {
        return $query->where('start_date', '<=', $endDate)
            ->where('end_date', '>=', $startDate);
    }

    public function coversDate(string $date): bool
    {
        return $date >= $this->start_date->toDateString()
            && $date <= $this->end_date->toDateString();
    }
}
