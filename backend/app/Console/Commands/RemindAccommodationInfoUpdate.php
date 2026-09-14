<?php

namespace App\Console\Commands;

use App\Mail\AccommodationInfoUpdateReminder;
use App\Models\Accommodation;
use App\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Demande utilisateur 2026-09-13/14 : "rajoute une logique de rappel de mise
 * à jour des informations pour les établissements non à jour". Distinct de
 * compliance:remind-hosts (RemindHostCompliance), qui ne couvre que le
 * dossier d'identité de l'hôte — ici c'est la fiche ÉTABLISSEMENT (tarifs,
 * disponibilités, photos, équipements) qui doit être reconfirmée
 * périodiquement, uniquement pour les établissements publiés (un
 * établissement en attente/rejeté a besoin d'être approuvé, pas relancé sur
 * sa fraîcheur).
 */
class RemindAccommodationInfoUpdate extends Command
{
    protected $signature = 'accommodations:remind-info-update';

    protected $description = "Relance les hôtes dont un établissement publié n'a pas confirmé ses informations depuis " . Accommodation::INFO_UPDATE_REMINDER_MONTHS . ' mois.';

    /** Délai minimum entre deux relances pour un même établissement, pour ne pas spammer un hôte qui n'a pas encore réagi. */
    private const MIN_DAYS_BETWEEN_REMINDERS = 30;

    public function handle(): int
    {
        $staleThreshold = now()->subMonths(Accommodation::INFO_UPDATE_REMINDER_MONTHS);
        $resendAfter = now()->subDays(self::MIN_DAYS_BETWEEN_REMINDERS);
        $sent = 0;

        Accommodation::published()
            ->where(function ($q) use ($staleThreshold) {
                $q->where(function ($q2) use ($staleThreshold) {
                    $q2->whereNotNull('info_confirmed_at')->where('info_confirmed_at', '<', $staleThreshold);
                })->orWhere(function ($q2) use ($staleThreshold) {
                    $q2->whereNull('info_confirmed_at')->where('created_at', '<', $staleThreshold);
                });
            })
            ->where(function ($q) use ($resendAfter) {
                $q->whereNull('info_update_reminder_sent_at')
                    ->orWhere('info_update_reminder_sent_at', '<', $resendAfter);
            })
            ->with('host')
            ->chunkById(100, function ($accommodations) use (&$sent) {
                foreach ($accommodations as $accommodation) {
                    if (!$accommodation->host?->email) {
                        continue;
                    }

                    try {
                        Mail::to($accommodation->host->email)->send(
                            AccommodationInfoUpdateReminder::forAccommodation($accommodation)
                        );
                    } catch (\Throwable $e) {
                        Log::error('Accommodation info update reminder email failed', [
                            'accommodation_id' => $accommodation->id,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    try {
                        Message::notifyHostAccommodationInfoOutdated($accommodation);
                    } catch (\Throwable $e) {
                        Log::error('Accommodation info update reminder in-app notification failed', [
                            'accommodation_id' => $accommodation->id,
                            'error' => $e->getMessage(),
                        ]);
                    }

                    $accommodation->update(['info_update_reminder_sent_at' => now()]);
                    $sent++;
                }
            });

        $this->info("{$sent} relance(s) de mise à jour d'établissement envoyée(s).");
        return self::SUCCESS;
    }
}
