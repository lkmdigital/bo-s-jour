<?php

namespace App\Services\Ops\Monitor;

use App\Models\Ops\OpsAlert;
use App\Models\Ops\OpsIncident;
use App\Models\Setting;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Envoi des alertes de supervision : WhatsApp (modèle approuvé par Meta, avec repli en texte libre) et
 * e-mail. Garde-fous : désactivable depuis l'admin, plafond horaire pour éviter une avalanche, et
 * heures calmes pour les incidents « importants » (les critiques partent toujours).
 */
class AlertService
{
    public const TEMPLATE = 'bosejour_alerte_supervision';

    private const LEVELS = ['critical' => 'CRITIQUE', 'major' => 'IMPORTANT', 'minor' => 'INFO'];

    public function __construct(private ?WhatsAppService $whatsapp = null)
    {
        $this->whatsapp ??= app(WhatsAppService::class);
    }

    public function enabled(): bool
    {
        return (bool) Setting::get('ops_alerts_enabled', false);
    }

    /** @return array<int,string> */
    public function phones(): array
    {
        return $this->csv((string) Setting::get('ops_alert_phones', ''));
    }

    /** @return array<int,string> */
    public function emails(): array
    {
        return $this->csv((string) Setting::get('ops_alert_emails', ''));
    }

    private function csv(string $value): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/[,;\n]+/', $value) ?: [])));
    }

    /**
     * Notifie l'ouverture, le rappel ou la résolution d'un incident.
     *
     * @param string $type opened | reminder | resolved
     */
    public function notifyIncident(OpsIncident $incident, string $type): void
    {
        if (!$this->enabled() || $incident->severity === 'minor') {
            return; // les incidents mineurs ne sont que dans le résumé quotidien
        }

        $level = self::LEVELS[$incident->severity] ?? 'INFO';
        $icon = $type === 'resolved' ? '✅' : ($incident->severity === 'critical' ? '🔴' : '🟠');
        $headline = match ($type) {
            'resolved' => "Rétabli : {$incident->title}",
            'reminder' => "Toujours en cours : {$incident->title}",
            default => $incident->title,
        };
        $since = $incident->first_seen_at->setTimezone('Africa/Abidjan')->format('d/m à H:i');
        $detail = mb_substr(trim(preg_replace('/\s+/', ' ', (string) $incident->last_message)), 0, 220);

        $this->sendEverywhere($incident, $type, $incident->severity, $level, $headline, "Depuis $since. $detail", $icon);
    }

    /** Message libre (résumé quotidien, test). */
    public function notifyText(string $type, string $level, string $headline, string $detail): void
    {
        $this->sendEverywhere(null, $type, 'critical', $level, $headline, $detail, '📋');
    }

    /**
     * Envoie un rapport (Mega Bo) aux mêmes destinataires que les alertes : WhatsApp (modèle approuvé, avec repli en
     * texte libre) et e-mail. Retourne le nombre d'envois réussis, tous canaux confondus.
     *
     * @param array<int,string> $templateParams variables du modèle WhatsApp, dans l'ordre
     */
    public function deliverReport(string $type, string $subject, string $html, string $template, array $templateParams, string $fallbackText): int
    {
        $delivered = 0;

        foreach ($this->phones() as $phone) {
            if ($this->whatsappBudgetExhausted()) {
                $this->record(null, $type, 'whatsapp', $phone, 'skipped', 'plafond horaire atteint');
                continue;
            }
            $sent = false;
            $error = null;
            try {
                $sent = $this->whatsapp->sendTemplate($phone, $template, $templateParams);
                if (!$sent) {
                    $sent = $this->whatsapp->sendText($phone, $fallbackText);
                    $error = $sent ? 'modèle indisponible, envoyé en texte libre' : 'WhatsApp a refusé le message';
                }
            } catch (\Throwable $e) {
                $error = $e->getMessage();
            }
            $delivered += $sent ? 1 : 0;
            $this->record(null, $type, 'whatsapp', $phone, $sent ? 'sent' : 'failed', $error);
        }

        foreach ($this->emails() as $email) {
            try {
                Mail::html($html, fn ($m) => $m->to($email)->subject($subject));
                $delivered++;
                $this->record(null, $type, 'email', $email, 'sent');
            } catch (\Throwable $e) {
                $this->record(null, $type, 'email', $email, 'failed', $e->getMessage());
            }
        }

        return $delivered;
    }

    private function sendEverywhere(?OpsIncident $incident, string $type, string $severity, string $level, string $headline, string $detail, string $icon): void
    {
        $quiet = $severity === 'major' && !in_array($type, ['test', 'digest'], true) && $this->isQuietHour();

        foreach ($this->phones() as $phone) {
            if ($quiet) {
                $this->record($incident, $type, 'whatsapp', $phone, 'skipped', 'heures calmes (22 h – 7 h)');
                continue;
            }
            if ($this->whatsappBudgetExhausted()) {
                $this->record($incident, $type, 'whatsapp', $phone, 'skipped', 'plafond horaire atteint');
                continue;
            }
            $sent = false;
            $error = null;
            try {
                $sent = $this->whatsapp->sendTemplate($phone, self::TEMPLATE, [$level, mb_substr($headline, 0, 120), mb_substr($detail, 0, 300)]);
                if (!$sent) {
                    // Modèle non disponible : texte libre (ne passe que si la personne a écrit au numéro dans les dernières 24 h).
                    $sent = $this->whatsapp->sendText($phone, "$icon boséjour — $level\n$headline\n$detail");
                    $error = $sent ? 'modèle indisponible, envoyé en texte libre' : 'WhatsApp a refusé le message';
                }
            } catch (\Throwable $e) {
                $error = $e->getMessage();
            }
            $this->record($incident, $type, 'whatsapp', $phone, $sent ? 'sent' : 'failed', $error);
        }

        foreach ($this->emails() as $email) {
            try {
                Mail::raw("$icon $level — $headline\n\n$detail\n\n— Supervision boséjour", fn ($m) => $m->to($email)->subject("[boséjour] $icon $level — " . mb_substr($headline, 0, 90)));
                $this->record($incident, $type, 'email', $email, 'sent');
            } catch (\Throwable $e) {
                $this->record($incident, $type, 'email', $email, 'failed', $e->getMessage());
            }
        }
    }

    private function record(?OpsIncident $incident, string $type, string $channel, string $recipient, string $status, ?string $error = null): void
    {
        OpsAlert::create([
            'ops_incident_id' => $incident?->id,
            'type' => $type,
            'channel' => $channel,
            'recipient' => $channel === 'whatsapp' ? substr($recipient, 0, 4) . '…' . substr($recipient, -3) : $recipient,
            'status' => $status,
            'error' => $error,
        ]);
        if ($status === 'failed') {
            Log::channel('single')->info('Ops : alerte non envoyée', ['canal' => $channel, 'erreur' => $error]);
        }
    }

    private function whatsappBudgetExhausted(): bool
    {
        $sent = OpsAlert::where('channel', 'whatsapp')->where('status', 'sent')->where('created_at', '>=', now()->subHour())->count();

        return $sent >= (int) config('ops.max_whatsapp_alerts_per_hour');
    }

    private function isQuietHour(): bool
    {
        $hour = (int) now('Africa/Abidjan')->format('G');

        return $hour >= 22 || $hour < 7;
    }
}
