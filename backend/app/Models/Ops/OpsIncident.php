<?php

namespace App\Models\Ops;

use Illuminate\Database\Eloquent\Model;

class OpsIncident extends Model
{
    protected $table = 'ops_incidents';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'resolved_at' => 'datetime',
            'opened_notified_at' => 'datetime',
            'last_reminder_at' => 'datetime',
            'resolved_notified_at' => 'datetime',
        ];
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }
}
