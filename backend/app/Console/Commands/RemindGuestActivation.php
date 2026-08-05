<?php

namespace App\Console\Commands;

use App\Mail\GuestActivationReminder;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RemindGuestActivation extends Command
{
    protected $signature = 'users:remind-guest-activation';

    protected $description = 'Relance les comptes invités non activés pour créer leur espace (H+2, H+24, H+72).';

    public function handle(): int
    {
        $now = now();
        $frontend = rtrim(config('services.frontend_url'), '/');
        $sent = 0;

        User::where('is_guest', true)
            ->where('activation_reminder_stage', '<', 3)
            ->whereNotNull('email')
            ->chunkById(100, function ($users) use ($now, $frontend, &$sent) {
                foreach ($users as $user) {
                    $hours = $user->created_at ? $user->created_at->diffInHours($now) : 0;

                    // Étape due selon l'ancienneté du compte invité.
                    $targetStage = $hours >= 72 ? 3 : ($hours >= 24 ? 2 : ($hours >= 2 ? 1 : 0));

                    // Rien de nouveau à envoyer (on n'envoie qu'un e-mail par exécution,
                    // en sautant directement à l'étape due pour les comptes anciens).
                    if ($targetStage <= $user->activation_reminder_stage) {
                        continue;
                    }

                    $activateUrl = $frontend . '/auth/activate?email=' . urlencode($user->email)
                        . ($user->name ? '&name=' . urlencode($user->name) : '');

                    try {
                        Mail::to($user->email)->send(
                            new GuestActivationReminder($user->name ?? 'cher voyageur', $activateUrl, $targetStage)
                        );

                        $user->activation_reminder_stage = $targetStage;
                        $user->save();
                        $sent++;
                    } catch (\Throwable $e) {
                        Log::error('Guest activation reminder failed', [
                            'user_id' => $user->id,
                            'stage'   => $targetStage,
                            'error'   => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("{$sent} relance(s) d'activation envoyée(s).");
        return self::SUCCESS;
    }
}
