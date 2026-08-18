<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketingCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'body',
        'url',
        'filters',
        'recipients_count',
        'status',
        'error',
        'sent_by',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
        ];
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
