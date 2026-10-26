<?php

namespace App\Services\Ops\Monitor;

use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;

/**
 * Transforme la suite des résultats d'un contrôle en incidents : ouverture après N échecs de suite (pas sur un
 * raté isolé), mise à jour et rappels tant que ça dure, résolution après retour à la normale. Notifie via AlertService.
 */
class IncidentManager
{
    public function __construct(private AlertService $alerts) {}

    public function process(MonitorCheck $check, OpsCheckResult $result): ?OpsIncident
    {
        $open = OpsIncident::where('check_key', $check->key)->where('status', 'open')->latest('id')->first();

        if ($result->status === 'ok') {
            return $open ? $this->maybeResolve($check, $open) : null;
        }

        // Un « warn » n'est qu'un signe de dégradation : incident mineur, sans alerte immédiate.
        $severity = $result->status === 'warn' ? 'minor' : $check->severity;

        if ($open) {
            $open->update([
                'failure_count' => $open->failure_count + 1,
                'last_seen_at' => now(),
                'last_message' => $result->message,
                'details' => $result->details,
                'screenshot' => $result->screenshot ?? $open->screenshot,
                'severity' => $this->worst($open->severity, $severity),
            ]);
            $this->remindIfDue($open);

            return $open;
        }

        $needed = max(1, $check->failuresBeforeAlert);
        $lastResults = OpsCheckResult::where('check_key', $check->key)->orderByDesc('id')->limit($needed)->pluck('status');
        if ($lastResults->count() < $needed || $lastResults->contains('ok')) {
            return null; // pas encore assez d'échecs de suite
        }

        $incident = OpsIncident::create([
            'check_key' => $check->key,
            'profile' => $check->profile,
            'severity' => $severity,
            'title' => $check->label,
            'status' => 'open',
            'failure_count' => $needed,
            'first_seen_at' => OpsCheckResult::where('check_key', $check->key)->orderByDesc('id')->skip($needed - 1)->value('created_at') ?? now(),
            'last_seen_at' => now(),
            'last_message' => $result->message,
            'details' => $result->details,
            'screenshot' => $result->screenshot,
        ]);
        $this->alerts->notifyIncident($incident, 'opened');
        $incident->update(['opened_notified_at' => now()]);

        return $incident;
    }

    private function maybeResolve(MonitorCheck $check, OpsIncident $open): ?OpsIncident
    {
        // Deux « ok » de suite pour clore un incident (un seul suffit pour les contrôles rares : ≥ 15 min).
        $needed = $check->intervalMinutes >= 15 ? 1 : 2;
        $last = OpsCheckResult::where('check_key', $check->key)->orderByDesc('id')->limit($needed)->pluck('status');
        if ($last->count() < $needed || $last->contains(fn ($s) => $s !== 'ok')) {
            return $open;
        }

        $open->update(['status' => 'resolved', 'resolved_at' => now(), 'last_message' => 'Rétabli — ' . $open->last_message]);
        if ($open->opened_notified_at) {
            $this->alerts->notifyIncident($open, 'resolved');
            $open->update(['resolved_notified_at' => now()]);
        }

        return $open;
    }

    private function remindIfDue(OpsIncident $incident): void
    {
        if ($incident->severity !== 'critical' || !$incident->opened_notified_at) {
            return;
        }
        $last = $incident->last_reminder_at ?? $incident->opened_notified_at;
        if ($last->diffInMinutes(now()) >= (int) config('ops.reminder_every_minutes')) {
            $this->alerts->notifyIncident($incident, 'reminder');
            $incident->update(['last_reminder_at' => now()]);
        }
    }

    private function worst(string $a, string $b): string
    {
        $rank = ['minor' => 1, 'major' => 2, 'critical' => 3];

        return ($rank[$a] ?? 0) >= ($rank[$b] ?? 0) ? $a : $b;
    }
}
