<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditTestAccountsCommandTest extends TestCase
{
    use RefreshDatabase;

    private const EMAILS = [
        'audit.voyageur1@bosejour-test.local',
        'audit.voyageur2@bosejour-test.local',
        'audit.hote1@bosejour-test.local',
        'audit.hote2@bosejour-test.local',
        'audit.admin@bosejour-test.local',
    ];

    public function test_create_creates_the_five_accounts_with_the_right_roles(): void
    {
        $this->artisan('audit:test-accounts create')->assertSuccessful();

        $this->assertSame(2, User::whereIn('email', self::EMAILS)->where('role', 'user')->count());
        $this->assertSame(2, User::whereIn('email', self::EMAILS)->where('role', 'host')->count());
        $this->assertSame(1, User::whereIn('email', self::EMAILS)->where('role', 'admin')->count());
        $this->assertTrue(User::whereIn('email', self::EMAILS)->whereNotNull('email_verified_at')->count() === 5);
    }

    public function test_create_is_idempotent_and_does_not_change_the_password_by_default(): void
    {
        $this->artisan('audit:test-accounts create');
        $hash = User::where('email', 'audit.admin@bosejour-test.local')->value('password');

        $this->artisan('audit:test-accounts create')->assertSuccessful();

        $this->assertSame(5, User::whereIn('email', self::EMAILS)->count());
        $this->assertSame($hash, User::where('email', 'audit.admin@bosejour-test.local')->value('password'));
    }

    public function test_reset_passwords_option_changes_the_password_hash(): void
    {
        $this->artisan('audit:test-accounts create');
        $hash = User::where('email', 'audit.admin@bosejour-test.local')->value('password');

        $this->artisan('audit:test-accounts create --reset-passwords');

        $this->assertNotSame($hash, User::where('email', 'audit.admin@bosejour-test.local')->value('password'));
    }

    public function test_remove_deletes_only_the_audit_test_accounts(): void
    {
        $other = User::factory()->create();
        $this->artisan('audit:test-accounts create');

        $this->artisan('audit:test-accounts remove')->assertSuccessful();

        $this->assertSame(0, User::whereIn('email', self::EMAILS)->count());
        $this->assertTrue(User::whereKey($other->id)->exists());
    }
}
