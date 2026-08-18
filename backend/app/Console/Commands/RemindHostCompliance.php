<?php

namespace App\Console\Commands;

use App\Mail\ComplianceReminder;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Relances conformité documentaire pour les hôtes non conformes, module
 * Paramètres > Conformité — J+30 / J+60 / J+90 / J+120 depuis l'inscription.
 */
class RemindHostCompliance extends Command
{
    protected $signature = 'compliance:remind-hosts';

    protected $description = "Relance les hôtes dont le dossier de conformité est incomplet (J+30, J+60, J+90, J+120 depuis l'inscription).";

    public function handle(): int
    {
        $now = now();
        $frontend = rtrim(config('services.frontend_url'), '/');
        $sent = 0;
        $reset = 0;

        User::where('role', 'host')
            ->whereNotNull('email')
            ->chunkById(100, function ($hosts) use ($now, $frontend, &$sent, &$reset) {
                foreach ($hosts as $host) {
                    // Redevenu conforme : on réinitialise pour que d'éventuelles
                    // futures non-conformités repartent du stade 0.
                    if ($host->compliance_status === 'conforme') {
                        if ($host->compliance_reminder_stage > 0) {
                            $host->compliance_reminder_stage = 0;
                            $host->save();
                            $reset++;
                        }
                        continue;
                    }

                    $anchor = $host->created_at;
                    $days = $anchor ? $anchor->diffInDays($now) : 0;
                    $targetStage = $days >= 120 ? 4 : ($days >= 90 ? 3 : ($days >= 60 ? 2 : ($days >= 30 ? 1 : 0)));

                    if ($targetStage <= $host->compliance_reminder_stage || $targetStage === 0) {
                        continue;
                    }

                    $missingLabels = collect($host->compliance_requirements)
                        ->filter(fn ($check) => empty($check['ok']))
                        ->pluck('label')
                        ->values()
                        ->all();

                    try {
                        Mail::to($host->email)->send(new ComplianceReminder(
                            $host->name ?? 'cher partenaire',
                            $frontend . '/dashboard/host/profile',
                            $targetStage,
                            $missingLabels
                        ));

                        $host->compliance_reminder_stage = $targetStage;
                        $host->save();
                        $sent++;
                    } catch (\Throwable $e) {
                        Log::error('Compliance reminder failed', [
                            'user_id' => $host->id,
                            'stage' => $targetStage,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("{$sent} relance(s) de conformité envoyée(s), {$reset} stade(s) réinitialisé(s).");
        return self::SUCCESS;
    }
}
