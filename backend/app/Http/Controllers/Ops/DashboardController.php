<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Models\Payment;

class DashboardController extends Controller
{
    public function index()
    {
        $stuckPaymentsCount = Payment::whereIn('status', ['pending', 'failed'])
            ->where('created_at', '>', now()->subDays(7))
            ->count();

        return view('ops.dashboard', compact('stuckPaymentsCount'));
    }
}
