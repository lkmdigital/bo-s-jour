<?php

namespace Tests\Feature;

use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Retour client 2026-09-02 : le responsable d'un établissement ne pouvait pas
 * changer son adresse e-mail (champ verrouillé côté front, aucun endpoint
 * côté API). Vérifie le flux en 2 étapes : demande -> OTP envoyé à la
 * NOUVELLE adresse -> l'e-mail n'est appliqué qu'après saisie du bon code.
 */
class HostEmailChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_change_sends_otp_to_new_address_without_changing_email_yet(): void
    {
        Mail::fake();
        $host = User::factory()->create(['role' => 'host', 'email' => 'ancien@example.com']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile/email/request-change', ['email' => 'nouveau@example.com'])
            ->assertOk();

        $host->refresh();
        $this->assertSame('ancien@example.com', $host->email, "l'e-mail ne doit pas changer avant confirmation");
        $this->assertSame('nouveau@example.com', $host->pending_email);
        $this->assertNotNull($host->email_otp_code);

        Mail::assertSent(OtpMail::class, function ($mail) {
            return $mail->hasTo('nouveau@example.com');
        });
    }

    public function test_confirm_change_applies_email_only_with_correct_code(): void
    {
        Mail::fake();
        $host = User::factory()->create(['role' => 'host', 'email' => 'ancien@example.com']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile/email/request-change', ['email' => 'nouveau@example.com'])->assertOk();
        $host->refresh();
        $code = $host->email_otp_code;

        // Mauvais code : rejeté, e-mail toujours inchangé.
        $this->postJson('/api/host/profile/email/confirm-change', ['code' => '000000'])
            ->assertStatus(422);
        $this->assertSame('ancien@example.com', $host->refresh()->email);

        // Bon code : appliqué.
        $this->postJson('/api/host/profile/email/confirm-change', ['code' => $code])
            ->assertOk()
            ->assertJson(['email' => 'nouveau@example.com']);

        $host->refresh();
        $this->assertSame('nouveau@example.com', $host->email);
        $this->assertNull($host->pending_email);
        $this->assertNull($host->email_otp_code);
    }

    public function test_cannot_request_change_to_an_email_already_in_use(): void
    {
        User::factory()->create(['email' => 'deja-pris@example.com']);
        $host = User::factory()->create(['role' => 'host', 'email' => 'ancien@example.com']);
        Sanctum::actingAs($host);

        $this->postJson('/api/host/profile/email/request-change', ['email' => 'deja-pris@example.com'])
            ->assertStatus(422);
    }

    public function test_staff_collaborator_cannot_change_owner_email(): void
    {
        $owner = User::factory()->create(['role' => 'host']);
        $staff = User::factory()->create([
            'role' => 'host',
            'staff_owner_id' => $owner->id,
            'staff_role' => 'receptionniste',
            'staff_permissions' => [],
        ]);
        Sanctum::actingAs($staff);

        $this->postJson('/api/host/profile/email/request-change', ['email' => 'nouveau@example.com'])
            ->assertStatus(403);
    }
}
