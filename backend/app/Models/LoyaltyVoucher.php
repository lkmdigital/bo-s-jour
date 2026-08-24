<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class LoyaltyVoucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reward_tier_id',
        'code',
        'discount_percent',
        'issued_at',
        'expires_at',
        'status',
        'used_for_booking_id',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'discount_percent' => 'decimal:2',
            'issued_at' => 'datetime',
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rewardTier()
    {
        return $this->belongsTo(LoyaltyRewardTier::class, 'reward_tier_id');
    }

    public function usedForBooking()
    {
        return $this->belongsTo(Booking::class, 'used_for_booking_id');
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function isAvailable(): bool
    {
        if ($this->status !== 'available') {
            return false;
        }
        return $this->expires_at === null || $this->expires_at->isFuture();
    }

    /**
     * Même calcul que Promotion::computeDiscount() (montant/pourcentage,
     * plafonné au prix de base) — un bon de fidélité est toujours en %.
     */
    public function computeDiscount(float $basePrice): float
    {
        $discount = $basePrice * (float) $this->discount_percent / 100;
        return min($discount, $basePrice);
    }

    public static function generateCode(): string
    {
        do {
            $code = 'FID-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        } while (self::where('code', $code)->exists());
        return $code;
    }
}
