<?php

use App\Http\Controllers\Ops\AuthController as OpsAuthController;
use App\Http\Controllers\Ops\DashboardController as OpsDashboardController;
use App\Http\Controllers\Ops\PaymentsController as OpsPaymentsController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'MonBeauPays.com API',
        'version' => '1.0.0',
    ]);
});

// Espace interne "Ops" (Blade + Vite + Tailwind), réservé aux administrateurs, indépendant
// du site public Next.js et de l'auth Sanctum de l'API — voir EnsureOpsAdmin.
Route::prefix('ops')->name('ops.')->group(function () {
    Route::get('/login', [OpsAuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [OpsAuthController::class, 'login'])->name('login.submit');
    Route::post('/logout', [OpsAuthController::class, 'logout'])->name('logout');

    Route::middleware('ops.admin')->group(function () {
        Route::get('/', [OpsDashboardController::class, 'index'])->name('dashboard');

        Route::prefix('payments')->name('payments.')->group(function () {
            Route::get('/', [OpsPaymentsController::class, 'index'])->name('index');
            Route::post('/{payment}/reconcile', [OpsPaymentsController::class, 'reconcile'])->name('reconcile');
        });
    });
});

