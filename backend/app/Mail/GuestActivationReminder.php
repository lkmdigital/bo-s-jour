<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class GuestActivationReminder extends Mailable
{
    use Queueable, SerializesModels;

    public string $userName;
    public string $activateUrl;
    public int $stage;

    public function __construct(string $userName, string $activateUrl, int $stage)
    {
        $this->userName = $userName;
        $this->activateUrl = $activateUrl;
        $this->stage = $stage;
    }

    public function build()
    {
        $subjects = [
            1 => 'Activez votre espace bo séjour',
            2 => 'Il ne reste qu’une étape pour votre espace bo séjour',
            3 => 'Dernier rappel : créez votre espace bo séjour',
        ];

        return $this->subject($subjects[$this->stage] ?? $subjects[1])
            ->view('emails.guest-activation-reminder', [
                'userName'    => $this->userName,
                'activateUrl' => $this->activateUrl,
                'stage'       => $this->stage,
            ]);
    }
}
