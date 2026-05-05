<?php

namespace App\Notifications\Messages;

class OneSignalEmailMessage
{
    public function __construct(
        public string $subject,
        public string $body,
        public ?string $url = null,
    ) {}
}
