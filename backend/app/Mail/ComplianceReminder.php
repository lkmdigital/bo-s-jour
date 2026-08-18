<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Relance conformité documentaire (Paramètres > Conformité), J+30/J+60/J+90/J+120
 * depuis l'inscription pour les hôtes dont le dossier reste incomplet.
 */
class ComplianceReminder extends Mailable
{
    use Queueable, SerializesModels;

    public string $hostName;
    public string $dashboardUrl;
    public int $stage;
    /** @var string[] */
    public array $missingLabels;

    public function __construct(string $hostName, string $dashboardUrl, int $stage, array $missingLabels = [])
    {
        $this->hostName = $hostName;
        $this->dashboardUrl = $dashboardUrl;
        $this->stage = $stage;
        $this->missingLabels = $missingLabels;
    }

    public function build()
    {
        $days = [1 => 30, 2 => 60, 3 => 90, 4 => 120][$this->stage] ?? 30;
        $subjects = [
            1 => 'Complétez le dossier de votre établissement',
            2 => 'Toujours en attente : documents de conformité manquants',
            3 => 'Votre établissement risque une suspension pour non-conformité',
            4 => 'Dernier rappel avant suspension pour non-conformité',
        ];

        return $this->subject($subjects[$this->stage] ?? $subjects[1])
            ->view('emails.compliance-reminder', [
                'hostName' => $this->hostName,
                'dashboardUrl' => $this->dashboardUrl,
                'stage' => $this->stage,
                'days' => $days,
                'missingLabels' => $this->missingLabels,
            ]);
    }
}
