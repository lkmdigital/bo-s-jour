<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'payment_id',
        'host_id',
        'booking_amount',
        'commission_rate',
        'commission_amount',
        'host_amount',
        'status',
        'released_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'booking_amount' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'host_amount' => 'decimal:2',
            'released_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    /** Montant disponible pour retrait (séjour commencé, pas encore versé). */
    public function isReleased(): bool
    {
        return $this->released_at !== null;
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function host()
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function isPaid()
    {
        return $this->status === 'paid';
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Vérifier s'il existe déjà une commission pour une réservation
     */
    public static function existsForBooking($bookingId)
    {
        return self::where('booking_id', $bookingId)->exists();
    }

    /**
     * Obtenir la commission pour une réservation (une seule par réservation)
     */
    public static function getForBooking($bookingId)
    {
        return self::where('booking_id', $bookingId)->first();
    }

    /**
     * Vérifier les commissions en double pour une réservation
     */
    public static function findDuplicatesForBooking($bookingId)
    {
        return self::where('booking_id', $bookingId)
            ->orderBy('created_at', 'desc')
            ->get();
    }
}

