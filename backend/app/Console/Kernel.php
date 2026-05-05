<?php

namespace App\Console;

use App\Console\Commands\CancelExpiredBookings;
use App\Console\Commands\RemindAndCancelUnpaidBookings;
use App\Console\Commands\SendPostStayReviewLinks;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Register the commands for the application.
     */
    protected $commands = [
        CancelExpiredBookings::class,
        RemindAndCancelUnpaidBookings::class,
    ];

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('bookings:cancel-expired')->everyFifteenMinutes();
        $schedule->command('bookings:remind-cancel-unpaid')->hourly();
        $schedule->command('reviews:send-post-stay-links')->dailyAt('09:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}

