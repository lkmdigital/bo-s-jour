<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestimonialReaction extends Model
{
    protected $fillable = [
        'platform_testimonial_id',
        'user_id',
        'type',
    ];

    public function testimonial()
    {
        return $this->belongsTo(PlatformTestimonial::class, 'platform_testimonial_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
