<?php

namespace App\Console\Commands;

use App\Models\Accommodation;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Réactivation des relances par étapes (comptes invités, onboarding et conformité des partenaires) : ces tâches
 * n'ont pas tourné pendant des mois, donc tous les comptes existants seraient « en retard » et recevraient d'un
 * coup leur DERNIÈRE relance. Cette commande aligne en silence chaque compteur sur l'étape que le compte a déjà
 * atteinte (sans rien envoyer) : seules les prochaines échéances déclencheront un message.
 *
 * Les seuils reprennent exactement ceux de RemindGuestActivation, RemindHostOnboarding et RemindHostCompliance.
 */
class FastForwardReminderStages extends Command
{
    protected $signature = 'reminders:fast-forward {--dry-run : Compte les comptes concernés sans rien modifier}';

    protected $description = 'Aligne en silence les compteurs de relance des comptes existants sur leur étape actuelle (aucun envoi).';

    public function handle(): int
    {
        $now = now();
        $dry = (bool) $this->option('dry-run');
        $counts = ['invités' => 0, 'onboarding' => 0, 'conformité' => 0];

        User::where('is_guest', true)->where('activation_reminder_stage', '<', 3)->whereNotNull('email')
            ->chunkById(100, function ($users) use ($now, $dry, &$counts) {
                foreach ($users as $user) {
                    $hours = $user->created_at ? $user->created_at->diffInHours($now) : 0;
                    $target = $hours >= 72 ? 3 : ($hours >= 24 ? 2 : ($hours >= 2 ? 1 : 0));
                    if ($target > $user->activation_reminder_stage) {
                        $counts['invités']++;
                        if (!$dry) {
                            $user->forceFill(['activation_reminder_stage' => $target])->save();
                        }
                    }
                }
            });

        User::where('role', 'host')->where('host_onboarding_reminder_stage', '<', 3)->whereNotNull('email')
            ->chunkById(100, function ($hosts) use ($now, $dry, &$counts) {
                foreach ($hosts as $host) {
                    $accommodations = Accommodation::withoutGlobalScopes()->where('host_id', $host->id)->get();
                    if ($accommodations->contains(fn ($a) => $a->submitted_for_review_at !== null || $a->status === 'published')) {
                        continue; // onboarding terminé : la commande d'origine l'ignore aussi
                    }
                    $anchor = $host->last_login_at ?? $host->created_at;
                    $hours = $anchor ? $anchor->diffInHours($now) : 0;
                    $target = $hours >= 168 ? 3 : ($hours >= 72 ? 2 : ($hours >= 24 ? 1 : 0));
                    if ($target > $host->host_onboarding_reminder_stage) {
                        $counts['onboarding']++;
                        if (!$dry) {
                            $host->forceFill(['host_onboarding_reminder_stage' => $target])->save();
                        }
                    }
                }
            });

        User::where('role', 'host')->whereNotNull('email')
            ->chunkById(100, function ($hosts) use ($now, $dry, &$counts) {
                foreach ($hosts as $host) {
                    if ($host->compliance_status === 'conforme') {
                        continue; // la commande d'origine remet son compteur à zéro, rien à aligner
                    }
                    $days = $host->created_at ? $host->created_at->diffInDays($now) : 0;
                    $target = $days >= 120 ? 4 : ($days >= 90 ? 3 : ($days >= 60 ? 2 : ($days >= 30 ? 1 : 0)));
                    if ($target > 0 && $target > $host->compliance_reminder_stage) {
                        $counts['conformité']++;
                        if (!$dry) {
                            $host->forceFill(['compliance_reminder_stage' => $target])->save();
                        }
                    }
                }
            });

        $verb = $dry ? 'seraient alignés' : 'alignés';
        $this->info("Compteurs $verb en silence : {$counts['invités']} compte(s) invité(s), {$counts['onboarding']} partenaire(s) (onboarding), {$counts['conformité']} partenaire(s) (conformité). Aucun message envoyé.");

        return self::SUCCESS;
    }
}
