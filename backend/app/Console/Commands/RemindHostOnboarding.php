<?php

namespace App\Console\Commands;

use App\Mail\HostOnboardingReminder;
use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Relances anti-abandon pour les hôtes qui ont commencé leur inscription sans
 * finaliser la configuration de leur établissement (brief Extranet Partenaire,
 * Étape 34 — H+24 / H+72 / H+168 après la dernière connexion).
 */
class RemindHostOnboarding extends Command
{
    protected $signature = 'hosts:remind-onboarding';

    protected $description = "Relance les hôtes dont l'établissement n'est pas encore soumis à la revue (H+24, H+72, H+168 après la dernière connexion).";

    public function handle(): int
    {
        $now = now();
        $frontend = rtrim(config('services.frontend_url'), '/');
        $sent = 0;

        User::where('role', 'host')
            ->where('host_onboarding_reminder_stage', '<', 3)
            ->whereNotNull('email')
            ->chunkById(100, function ($hosts) use ($now, $frontend, &$sent) {
                foreach ($hosts as $host) {
                    $accommodations = Accommodation::where('host_id', $host->id)->get();

                    // Déjà finalisé (au moins un établissement soumis à la revue ou publié) :
                    // plus rien à relancer.
                    $completed = $accommodations->contains(
                        fn ($a) => $a->submitted_for_review_at !== null || $a->status === 'published'
                    );
                    if ($completed) {
                        continue;
                    }

                    $anchor = $host->last_login_at ?? $host->created_at;
                    $hours = $anchor ? $anchor->diffInHours($now) : 0;
                    $targetStage = $hours >= 168 ? 3 : ($hours >= 72 ? 2 : ($hours >= 24 ? 1 : 0));

                    if ($targetStage <= $host->host_onboarding_reminder_stage) {
                        continue;
                    }

                    $missingLabel = $this->firstMissingChecklistItem($accommodations->first());

                    try {
                        Mail::to($host->email)->send(new HostOnboardingReminder(
                            $host->name ?? 'cher partenaire',
                            $frontend . '/dashboard/host',
                            $targetStage,
                            $missingLabel
                        ));

                        $host->host_onboarding_reminder_stage = $targetStage;
                        $host->save();
                        $sent++;
                    } catch (\Throwable $e) {
                        Log::error('Host onboarding reminder failed', [
                            'user_id' => $host->id,
                            'stage'   => $targetStage,
                            'error'   => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("{$sent} relance(s) d'onboarding hôte envoyée(s).");
        return self::SUCCESS;
    }

    /**
     * Premier critère manquant de la checklist de publication (même logique que
     * AccommodationController::readiness()), pour donner une indication concrète
     * au lieu d'un message générique.
     */
    private function firstMissingChecklistItem(?Accommodation $accommodation): ?string
    {
        if (!$accommodation) {
            return "créer votre établissement";
        }
        if ($accommodation->images()->count() < 5) {
            return 'ajouter au moins 5 photos';
        }
        if ((float) $accommodation->price_per_night <= 0) {
            return 'définir un prix par nuit';
        }
        if (empty($accommodation->whatsapp)) {
            return "renseigner le numéro WhatsApp de l'établissement";
        }
        if (!($accommodation->host?->hasBankDetails() ?? false)) {
            return 'renseigner vos coordonnées bancaires';
        }
        return null;
    }
}
