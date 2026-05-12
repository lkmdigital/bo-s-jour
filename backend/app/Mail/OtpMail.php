<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $userName;
    public string $code;

    public function __construct(string $userName, string $code)
    {
        $this->userName = $userName;
        $this->code = $code;
    }

    public function build()
    {
        return $this->subject('Votre code de vérification BosEjour')
                    ->view('emails.otp')
                    ->with([
                        'userName' => $this->userName,
                        'code'     => $this->code,
                    ]);
    }
}
