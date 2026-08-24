<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyPointsTransaction extends Model
{
    use HasFactory;

    public const TYPE_BOOKING_EARN = 'booking_earn';
    public const TYPE_FIRST_BOOKING_BONUS = 'first_booking_bonus';
    public const TYPE_BIRTHDAY_BONUS = 'birthday_bonus';
    public const TYPE_REFERRAL_PARRAIN = 'referral_parrain';
    public const TYPE_REFERRAL_FILLEUL = 'referral_filleul';
    public const TYPE_REVIEW_BONUS = 'review_bonus';
    public const TYPE_CAMPAIGN_BONUS = 'campaign_bonus';
    public const TYPE_VOUCHER_CLAIMED = 'voucher_claimed';
    public const TYPE_ADMIN_ADJUSTMENT = 'admin_adjustment';

    public const LABELS = [
        self::TYPE_BOOKING_EARN => 'Points gagnés (séjour)',
        self::TYPE_FIRST_BOOKING_BONUS => 'Bonus première réservation',
        self::TYPE_BIRTHDAY_BONUS => 'Bonus anniversaire',
        self::TYPE_REFERRAL_PARRAIN => 'Bonus parrainage (parrain)',
        self::TYPE_REFERRAL_FILLEUL => 'Bonus parrainage (filleul)',
        self::TYPE_REVIEW_BONUS => 'Bonus avis',
        self::TYPE_CAMPAIGN_BONUS => 'Bonus campagne',
        self::TYPE_VOUCHER_CLAIMED => 'Bon réclamé',
        self::TYPE_ADMIN_ADJUSTMENT => 'Ajustement administrateur',
    ];

    protected $fillable = ['user_id', 'points', 'type', 'booking_id', 'voucher_id', 'description'];

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function voucher()
    {
        return $this->belongsTo(LoyaltyVoucher::class, 'voucher_id');
    }
}
