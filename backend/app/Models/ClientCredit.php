<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientCredit extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'currency',
        'source_booking_id',
        'source_type',
        'status',
        'used_at',
        'used_for_booking_id',
        'expires_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public const SOURCE_CANCELLATION = 'cancellation';
    public const SOURCE_MANUAL = 'manual';
    public const SOURCE_PROMOTION = 'promotion';

    public const STATUS_AVAILABLE = 'available';
    public const STATUS_USED = 'used';
    public const STATUS_EXPIRED = 'expired';

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sourceBooking()
    {
        return $this->belongsTo(Booking::class, 'source_booking_id');
    }

    public function usedForBooking()
    {
        return $this->belongsTo(Booking::class, 'used_for_booking_id');
    }

    public function isAvailable(): bool
    {
        if ($this->status !== self::STATUS_AVAILABLE) {
            return false;
        }
        if ($this->expires_at && now()->greaterThan($this->expires_at)) {
            return false;
        }
        return true;
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', self::STATUS_AVAILABLE)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Solde total des avoirs disponibles pour un utilisateur.
     */
    public static function balanceForUser(int $userId): float
    {
        return (float) self::where('user_id', $userId)->available()->sum('amount');
    }
}
