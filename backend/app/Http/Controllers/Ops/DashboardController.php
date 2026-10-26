<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Models\Ops\OpsIncident;
use App\Models\Payment;
use App\Services\Ops\Monitor\MonitorRunner;

class DashboardController extends Controller
{
    public function index()
    {
        $stuckPaymentsCount = Payment::whereIn('status', ['pending', 'failed'])
            ->where('created_at', '>', now()->subDays(7))
            ->count();

        $openIncidents = OpsIncident::where('status', 'open')->get();
        $lastRun = MonitorRunner::lastRunAt();
        $supervision = [
            'open' => $openIncidents->count(),
            'critical' => $openIncidents->where('severity', 'critical')->count(),
            'stale' => !$lastRun || now()->timestamp - $lastRun > 300,
        ];

        return view('ops.dashboard', compact('stuckPaymentsCount', 'supervision'));
    }
}
