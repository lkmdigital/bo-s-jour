<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralPartnerClick extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['referral_partner_id', 'visitor_hash'];
}
