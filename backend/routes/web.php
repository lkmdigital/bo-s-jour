<?php

use App\Http\Controllers\Ops\AudienceController as OpsAudienceController;
use App\Http\Controllers\Ops\AuthController as OpsAuthController;
use App\Http\Controllers\Ops\DashboardController as OpsDashboardController;
use App\Http\Controllers\Ops\LogsController as OpsLogsController;
use App\Http\Controllers\Ops\MonitoringController as OpsMonitoringController;
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

    // Signal de vie pour un service externe de surveillance (jeton dans l'adresse, aucune session).
    Route::get('/heartbeat/{token}', [OpsMonitoringController::class, 'heartbeat'])->name('heartbeat');

    Route::middleware('ops.admin')->group(function () {
        Route::get('/', [OpsDashboardController::class, 'index'])->name('dashboard');

        Route::get('/audience', [OpsAudienceController::class, 'index'])->name('audience.index');

        Route::prefix('supervision')->name('monitoring.')->group(function () {
            Route::get('/', [OpsMonitoringController::class, 'index'])->name('index');
            Route::post('/run', [OpsMonitoringController::class, 'runNow'])->name('run');
            Route::get('/incidents', [OpsMonitoringController::class, 'incidents'])->name('incidents');
            Route::get('/erreurs', [OpsMonitoringController::class, 'errors'])->name('errors');
            Route::get('/captures/{path}', [OpsMonitoringController::class, 'screenshot'])->name('screenshot')->where('path', '[A-Za-z0-9._-]+');
            Route::get('/reglages', [OpsMonitoringController::class, 'settings'])->name('settings');
            Route::post('/reglages', [OpsMonitoringController::class, 'saveSettings'])->name('settings.save');
            Route::post('/reglages/test', [OpsMonitoringController::class, 'testAlert'])->name('settings.test');
        });

        Route::prefix('payments')->name('payments.')->group(function () {
            Route::get('/', [OpsPaymentsController::class, 'index'])->name('index');
            Route::post('/{payment}/reconcile', [OpsPaymentsController::class, 'reconcile'])->name('reconcile');
        });

        Route::prefix('logs')->name('logs.')->group(function () {
            Route::get('/', [OpsLogsController::class, 'index'])->name('index');
            Route::get('/tail', [OpsLogsController::class, 'tail'])->name('tail');
        });
    });
});

