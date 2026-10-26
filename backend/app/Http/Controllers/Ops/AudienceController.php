<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Services\Ops\AudienceReport;
use Illuminate\Http\Request;

/** Page « Audience » d'Ops : combien de personnes visitent boséjour, d'où elles viennent, sur quoi elles cliquent. */
class AudienceController extends Controller
{
    public function index(Request $request, AudienceReport $report)
    {
        return view('ops.audience.index', ['r' => $report->build((string) $request->query('period', '7d')), 'periods' => AudienceReport::PERIODS]);
    }
}
