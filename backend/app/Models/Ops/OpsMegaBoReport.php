<?php

namespace App\Models\Ops;

use Illuminate\Database\Eloquent\Model;

class OpsMegaBoReport extends Model
{
    protected $table = 'ops_mega_bo_reports';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['report_date' => 'date:Y-m-d', 'snapshot' => 'array', 'sent_at' => 'datetime'];
    }
}
