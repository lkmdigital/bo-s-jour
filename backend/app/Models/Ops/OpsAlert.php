<?php

namespace App\Models\Ops;

use Illuminate\Database\Eloquent\Model;

class OpsAlert extends Model
{
    protected $table = 'ops_alerts';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
