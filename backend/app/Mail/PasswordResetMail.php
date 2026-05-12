<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $userName;
    public string $resetUrl;

    public function __construct(string $userName, string $resetUrl)
    {
        $this->userName = $userName;
        $this->resetUrl = $resetUrl;
    }

    public function build()
    {
        return $this->subject('Réinitialisation de votre mot de passe BosEjour')
                    ->view('emails.password-reset')
                    ->with([
                        'userName' => $this->userName,
                        'resetUrl' => $this->resetUrl,
                    ]);
    }
}
