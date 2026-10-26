<?php

namespace App\Models\Ops;

use Illuminate\Database\Eloquent\Model;

class OpsCheckResult extends Model
{
    protected $table = 'ops_check_results';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['details' => 'array', 'created_at' => 'datetime'];
    }
}
