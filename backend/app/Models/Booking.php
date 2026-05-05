<?php

namespace App\Models;

use App\Enums\BookingStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'accommodation_id',
        'room_id',
        'check_in',
        'check_out',
        'guests',
        'total_price',
        'deposit_amount',
        'payment_type',
        'amount_paid',
        'status',
        'payment_status',
        'confirmation_code',
        'checked_in_at',
        'is_non_refundable',
        'cancellation_policy_hours_snapshot',
        'special_requests',
        'booked_for_third_party',
        'traveler_name',
        'traveler_phone',
        'traveler_email',
        'deposit_paid_at',
        'expires_at',
        'review_token',
        'review_link_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'check_in'                => 'date',
            'check_out'               => 'date',
            'total_price'             => 'decimal:2',
            'deposit_amount'          => 'decimal:2',
            'amount_paid'             => 'decimal:2',
            'deposit_paid_at'         => 'datetime',
            'expires_at'              => 'datetime',
            'review_link_sent_at'     => 'datetime',
            'checked_in_at'           => 'datetime',
            'status'                  => BookingStatus::class,
            'booked_for_third_party'  => 'boolean',
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

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function isPaid()
    {
        return in_array($this->payment_status, ['paid', 'guarantee_paid'], true);
    }

    public function scopePending($query)
    {
        return $query->where('status', BookingStatus::Pending->value);
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', BookingStatus::Confirmed->value);
    }

    public function scopeCancelled($query)
    {
        return $query->where('status', BookingStatus::Cancelled->value);
    }

    public function remainingBalance(): float
    {
        return max((float) $this->total_price - (float) $this->amount_paid, 0);
    }

    public function hasPaidDeposit(): bool
    {
        if ($this->deposit_amount <= 0) {
            return false;
        }

        return (float) $this->amount_paid >= (float) $this->deposit_amount;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && now()->greaterThan($this->expires_at);
    }

    /** La réservation est-elle non remboursable (aucun remboursement ni avoir en cas d'annulation) ? */
    public function isNonRefundable(): bool
    {
        if (isset($this->is_non_refundable)) {
            return (bool) $this->is_non_refundable;
        }
        $hours = $this->cancellation_policy_hours_snapshot ?? $this->accommodation?->cancellation_policy_hours ?? 48;
        return (int) $hours === 0;
    }

    /** Peut-on modifier gratuitement (au moins 48h avant arrivée) ? */
    public function canModifyFree(): bool
    {
        if ($this->isNonRefundable()) {
            return false;
        }
        $hoursBeforeArrival = $this->check_in ? now()->diffInHours(\Carbon\Carbon::parse($this->check_in), false) : 0;
        $requiredHours = (int) ($this->cancellation_policy_hours_snapshot ?? 48);
        return $hoursBeforeArrival >= $requiredHours;
    }

    public function clientCredits()
    {
        return $this->hasMany(ClientCredit::class, 'source_booking_id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(BookingHistory::class)->latest();
    }

    public function canTransitionTo(BookingStatus $status): bool
    {
        return $this->status->canTransitionTo($status);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', BookingStatus::Completed->value);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', BookingStatus::occupying());
    }

    /**
     * Génère un code de confirmation unique (à présenter au gérant à l'arrivée).
     */
    public static function generateConfirmationCode(): string
    {
        do {
            $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        } while (self::where('confirmation_code', $code)->exists());
        return $code;
    }

    public function isCheckedIn(): bool
    {
        return $this->checked_in_at !== null;
    }
}

