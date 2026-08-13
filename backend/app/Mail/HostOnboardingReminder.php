<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class HostOnboardingReminder extends Mailable
{
    use Queueable, SerializesModels;

    public string $hostName;
    public string $dashboardUrl;
    public int $stage;
    public ?string $missingLabel;

    public function __construct(string $hostName, string $dashboardUrl, int $stage, ?string $missingLabel = null)
    {
        $this->hostName = $hostName;
        $this->dashboardUrl = $dashboardUrl;
        $this->stage = $stage;
        $this->missingLabel = $missingLabel;
    }

    public function build()
    {
        $subjects = [
            1 => 'Il ne manque plus grand-chose à votre établissement',
            2 => 'Votre établissement est presque prêt à recevoir des réservations',
            3 => 'Dernier rappel : finalisez votre établissement sur bo séjour',
        ];

        return $this->subject($subjects[$this->stage] ?? $subjects[1])
            ->view('emails.host-onboarding-reminder', [
                'hostName'     => $this->hostName,
                'dashboardUrl' => $this->dashboardUrl,
                'stage'        => $this->stage,
                'missingLabel' => $this->missingLabel,
            ]);
    }
}
