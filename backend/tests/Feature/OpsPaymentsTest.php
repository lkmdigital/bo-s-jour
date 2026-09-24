<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpsPaymentsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_login_page_is_reachable_without_authentication(): void
    {
        $this->get('/ops')->assertRedirect('/ops/login');
        $this->get('/ops/login')->assertOk();
    }

    public function test_non_admin_cannot_access_the_ops_area(): void
    {
        $user = User::factory()->create(['role' => 'user', 'password' => bcrypt('password123')]);

        // back() redirige en test vers '/' faute de Referer (pas de navigateur réel) ;
        // ce qui compte est que la session d'authentification n'a jamais été ouverte.
        $this->post('/ops/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertSessionHasErrors('email');

        $this->assertGuest('web');
    }

    public function test_admin_can_log_in_and_see_the_dashboard(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'password' => bcrypt('password123')]);

        $this->post('/ops/login', ['email' => $admin->email, 'password' => 'password123'])
            ->assertRedirect('/ops');

        $this->assertAuthenticatedAs($admin, 'web');
        $this->get('/ops')->assertOk()->assertSee("Vue d'ensemble");
    }

    public function test_pending_payments_are_listed_and_can_be_reconciled(): void
    {
        $booking = Booking::factory()->create();
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id,
            'amount' => 25000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-OPS-1',
            'transaction_id' => 'txn-123',
        ]);

        Http::fake(['*' => Http::response(['status' => 'success', 'montant' => 25000], 200)]);

        $this->actingAs($this->admin(), 'web')
            ->get('/ops/payments')
            ->assertOk()
            ->assertSee($payment->payment_reference);

        $this->actingAs($this->admin(), 'web')
            ->post("/ops/payments/{$payment->id}/reconcile")
            ->assertRedirect();

        $this->assertSame('completed', $payment->fresh()->status);
    }

    public function test_reconcile_without_transaction_id_is_refused(): void
    {
        $booking = Booking::factory()->create();
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'user_id' => $booking->user_id,
            'amount' => 25000,
            'status' => 'pending',
            'purpose' => 'full',
            'payment_method' => 'wave-ci',
            'payment_reference' => 'REF-OPS-2',
        ]);

        $this->actingAs($this->admin(), 'web')
            ->post("/ops/payments/{$payment->id}/reconcile")
            ->assertRedirect()
            ->assertSessionHas('ops_error');

        $this->assertSame('pending', $payment->fresh()->status);
    }
}
