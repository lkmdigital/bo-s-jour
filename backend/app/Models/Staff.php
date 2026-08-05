<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Staff extends Model
{
    use HasFactory;

    protected $table = 'staff';

    protected $fillable = [
        'accommodation_id',
        'name',
        'role',
        'email',
        'phone',
        'status',
    ];

    public function accommodation()
    {
        return $this->belongsTo(Accommodation::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
