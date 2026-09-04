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
        'promotion_id',
        'check_in',
        'check_out',
        'guests',
        'total_price',
        'base_price',
        'deposit_amount',
        'payment_type',
        'amount_paid',
        'status',
        'payment_status',
        'confirmation_code',
        'booking_number',
        'checked_in_at',
        'is_non_refundable',
        'cancellation_policy_hours_snapshot',
        'special_requests',
        'booked_for_third_party',
        'traveler_name',
        'traveler_phone',
        'traveler_email',
        'traveler_type',
        'company_name',
        'company_vat',
        'company_address',
        'company_country',
        'company_city',
        'company_billing_email',
        'company_service',
        'company_project',
        'corporate_owner_id',
        'deferred_payment',
        'residence_country',
        'residence_city',
        'no_show_at',
        'refund_amount',
        'credit_amount',
        'refunded_at',
        'deposit_paid_at',
        'expires_at',
        'review_token',
        'review_link_sent_at',
        'loyalty_voucher_id',
        'loyalty_points_awarded_at',
    ];

    protected function casts(): array
    {
        return [
            'check_in'                => 'date',
            'check_out'               => 'date',
            'total_price'             => 'decimal:2',
            'base_price'              => 'decimal:2',
            'deposit_amount'          => 'decimal:2',
            'amount_paid'             => 'decimal:2',
            'deposit_paid_at'         => 'datetime',
            'expires_at'              => 'datetime',
            'review_link_sent_at'     => 'datetime',
            'loyalty_points_awarded_at' => 'datetime',
            'checked_in_at'           => 'datetime',
            'status'                  => BookingStatus::class,
            'booked_for_third_party'  => 'boolean',
            'deferred_payment'        => 'boolean',
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

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function loyaltyVoucher()
    {
        return $this->belongsTo(LoyaltyVoucher::class);
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

    /**
     * Génère le numéro de réservation — référence stable et séquentielle
     * (facturation, support, export compta), distincte du confirmation_code
     * (clé aléatoire de vérification à l'arrivée). Format BS-{année}-{séquence
     * 6 chiffres}, remise à 1 chaque nouvelle année — retour client 2026-09-02
     * ("Format recommandé : BS-AAAA-XXXXXX, par exemple BS-2026-0001").
     * Ancien format RES-{année}-{5 chiffres} conservé tel quel sur les
     * réservations déjà numérotées (numéro non modifiable une fois attribué) ;
     * seules les nouvelles réservations reçoivent le nouveau format.
     */
    public static function generateBookingNumber(?\Carbon\Carbon $at = null): string
    {
        $year = ($at ?? now())->format('Y');
        $prefix = "BS-{$year}-";

        do {
            $maxSeq = (int) \Illuminate\Support\Facades\DB::table('bookings')
                ->where('booking_number', 'like', $prefix . '%')
                ->selectRaw("MAX(CAST(SUBSTRING(booking_number, ?) AS UNSIGNED)) as max_seq", [strlen($prefix) + 1])
                ->value('max_seq');

            $sequence = str_pad((string) ($maxSeq + 1), 6, '0', STR_PAD_LEFT);
            $number = $prefix . $sequence;
        } while (self::where('booking_number', $number)->exists());

        return $number;
    }

    public function isCheckedIn(): bool
    {
        return $this->checked_in_at !== null;
    }
}

