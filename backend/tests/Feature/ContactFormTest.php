<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContactFormTest extends TestCase
{
    public function test_contact_form_accepts_a_valid_message(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', [
            'name' => 'Awa Koné', 'email' => 'awa@example.com', 'subject' => 'Question', 'message' => 'Bonjour, j\'ai une question sur ma réservation.',
        ])->assertOk();
    }

    public function test_contact_form_validates_input_and_rejects_bots(): void
    {
        $this->postJson('/api/contact', ['name' => '', 'email' => 'x', 'message' => 'court'])->assertStatus(422);
        $this->postJson('/api/contact', ['name' => 'A', 'email' => 'a@b.co', 'message' => 'Un message assez long.', 'website' => 'http://spam'])->assertStatus(422);
    }
}
