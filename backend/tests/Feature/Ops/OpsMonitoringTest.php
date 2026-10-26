<?php

namespace Tests\Feature\Ops;

use App\Models\Accommodation;
use App\Models\Ops\OpsAlert;
use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;
use App\Models\Setting;
use App\Models\User;
use App\Services\Ops\Monitor\AlertService;
use App\Services\Ops\Monitor\ApiJourney;
use App\Services\Ops\Monitor\CheckResult;
use App\Services\Ops\Monitor\IncidentManager;
use App\Services\Ops\Monitor\MonitorCheck;
use App\Services\Ops\Monitor\MonitorHttp;
use App\Services\Ops\Monitor\MonitorRunner;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Supervision : ouverture/résolution des incidents, alertes, signal de vie, parcours API,
 * et protections des données de test (invisibles du public, jamais de message réel).
 */
class OpsMonitoringTest extends TestCase
{
    use RefreshDatabase;

    private function check(string $severity = 'critical', int $failuresBeforeAlert = 2, int $interval = 5): MonitorCheck
    {
        return new MonitorCheck('test.check', 'Contrôle de test', 'system', 'api', $severity, $interval, $failuresBeforeAlert, fn () => CheckResult::ok());
    }

    private function manager(?AlertService $alerts = null): IncidentManager
    {
        return new IncidentManager($alerts ?? $this->createMock(AlertService::class));
    }

    private function makeResult(string $status, string $key = 'test.check'): OpsCheckResult
    {
        return OpsCheckResult::create(['check_key' => $key, 'profile' => 'system', 'kind' => 'api', 'status' => $status, 'duration_ms' => 5, 'message' => "résultat $status"]);
    }

    // ── Incidents ───────────────────────────────────────────────────────────────────────────

    public function test_one_isolated_failure_does_not_open_an_incident(): void
    {
        $manager = $this->manager();
        $check = $this->check();

        $this->assertNull($manager->process($check, $this->makeResult('fail')));
        $this->assertSame(0, OpsIncident::count());
    }

    public function test_consecutive_failures_open_one_incident_and_notify_once(): void
    {
        $alerts = $this->createMock(AlertService::class);
        $alerts->expects($this->once())->method('notifyIncident')->with($this->callback(fn ($i) => $i->severity === 'critical'), 'opened');
        $manager = $this->manager($alerts);
        $check = $this->check();

        $manager->process($check, $this->makeResult('fail'));
        $incident = $manager->process($check, $this->makeResult('fail'));
        $manager->process($check, $this->makeResult('fail')); // suite : mise à jour, pas de nouvelle alerte

        $this->assertSame(1, OpsIncident::count());
        $this->assertSame('open', $incident->fresh()->status);
        $this->assertSame(3, $incident->fresh()->failure_count);
    }

    public function test_incident_is_resolved_after_two_consecutive_successes_and_the_recovery_is_notified(): void
    {
        $alerts = $this->createMock(AlertService::class);
        $events = [];
        $alerts->method('notifyIncident')->willReturnCallback(function ($incident, $type) use (&$events) { $events[] = $type; });
        $manager = $this->manager($alerts);
        $check = $this->check();

        $manager->process($check, $this->makeResult('fail'));
        $manager->process($check, $this->makeResult('fail'));
        $manager->process($check, $this->makeResult('ok'));
        $this->assertSame('open', OpsIncident::first()->status, 'un seul succès ne suffit pas');
        $manager->process($check, $this->makeResult('ok'));

        $this->assertSame('resolved', OpsIncident::first()->status);
        $this->assertSame(['opened', 'resolved'], $events);
    }

    public function test_a_warning_only_creates_a_minor_incident_that_is_not_notified(): void
    {
        $alerts = new AlertService($this->createMock(WhatsAppService::class));
        Setting::set('ops_alerts_enabled', true, 'boolean');
        Setting::set('ops_alert_phones', '2250161133466', 'string');
        $manager = $this->manager($alerts);
        $check = $this->check('critical', 1);

        $manager->process($check, $this->makeResult('warn'));

        $this->assertSame('minor', OpsIncident::first()->severity);
        $this->assertSame(0, OpsAlert::count(), 'les incidents mineurs restent dans le résumé quotidien');
    }

    public function test_critical_incident_sends_reminders_but_not_before_the_delay(): void
    {
        $alerts = $this->createMock(AlertService::class);
        $types = [];
        $alerts->method('notifyIncident')->willReturnCallback(function ($incident, $type) use (&$types) { $types[] = $type; });
        $manager = $this->manager($alerts);
        $check = $this->check('critical', 1);

        $manager->process($check, $this->makeResult('fail'));
        $manager->process($check, $this->makeResult('fail'));
        $this->assertSame(['opened'], $types);

        OpsIncident::first()->update(['opened_notified_at' => now()->subMinutes(61)]);
        $manager->process($check, $this->makeResult('fail'));
        $this->assertSame(['opened', 'reminder'], $types);
    }

    // ── Alertes ─────────────────────────────────────────────────────────────────────────────

    public function test_alerts_do_nothing_while_disabled(): void
    {
        $whatsapp = $this->createMock(WhatsAppService::class);
        $whatsapp->expects($this->never())->method('sendTemplate');
        $incident = OpsIncident::create(['check_key' => 'k', 'profile' => 'system', 'severity' => 'critical', 'title' => 'T', 'first_seen_at' => now(), 'last_seen_at' => now(), 'last_message' => 'm']);
        Setting::set('ops_alert_phones', '2250161133466', 'string');

        (new AlertService($whatsapp))->notifyIncident($incident, 'opened');

        $this->assertSame(0, OpsAlert::count());
    }

    public function test_critical_alert_goes_to_whatsapp_and_email_and_is_logged_with_a_masked_number(): void
    {
        Mail::fake();
        $whatsapp = $this->createMock(WhatsAppService::class);
        $whatsapp->expects($this->once())->method('sendTemplate')->with('2250161133466', AlertService::TEMPLATE, $this->anything())->willReturn(true);
        Setting::set('ops_alerts_enabled', true, 'boolean');
        Setting::set('ops_alert_phones', '2250161133466', 'string');
        Setting::set('ops_alert_emails', 'moi@example.com', 'string');
        $incident = OpsIncident::create(['check_key' => 'k', 'profile' => 'system', 'severity' => 'critical', 'title' => 'Paiement en panne', 'first_seen_at' => now(), 'last_seen_at' => now(), 'last_message' => 'm']);

        (new AlertService($whatsapp))->notifyIncident($incident, 'opened');

        $this->assertSame(2, OpsAlert::where('status', 'sent')->count());
        $this->assertSame('2250…466', OpsAlert::where('channel', 'whatsapp')->value('recipient'));
    }

    public function test_major_alerts_are_held_back_at_night_but_critical_ones_still_go(): void
    {
        $this->travelTo(now('Africa/Abidjan')->setTime(23, 30));
        $whatsapp = $this->createMock(WhatsAppService::class);
        $whatsapp->expects($this->once())->method('sendTemplate')->willReturn(true); // seulement le critique
        Setting::set('ops_alerts_enabled', true, 'boolean');
        Setting::set('ops_alert_phones', '2250161133466', 'string');
        $major = OpsIncident::create(['check_key' => 'a', 'profile' => 'system', 'severity' => 'major', 'title' => 'A', 'first_seen_at' => now(), 'last_seen_at' => now(), 'last_message' => 'm']);
        $critical = OpsIncident::create(['check_key' => 'b', 'profile' => 'system', 'severity' => 'critical', 'title' => 'B', 'first_seen_at' => now(), 'last_seen_at' => now(), 'last_message' => 'm']);
        $service = new AlertService($whatsapp);

        $service->notifyIncident($major, 'opened');
        $service->notifyIncident($critical, 'opened');

        $this->assertSame('skipped', OpsAlert::where('ops_incident_id', $major->id)->value('status'));
        $this->assertSame('sent', OpsAlert::where('ops_incident_id', $critical->id)->value('status'));
    }

    public function test_whatsapp_alerts_are_capped_per_hour(): void
    {
        config(['ops.max_whatsapp_alerts_per_hour' => 2]);
        $whatsapp = $this->createMock(WhatsAppService::class);
        $whatsapp->expects($this->exactly(2))->method('sendTemplate')->willReturn(true);
        Setting::set('ops_alerts_enabled', true, 'boolean');
        Setting::set('ops_alert_phones', '2250161133466', 'string');
        $service = new AlertService($whatsapp);

        for ($i = 0; $i < 4; $i++) {
            $incident = OpsIncident::create(['check_key' => "k$i", 'profile' => 'system', 'severity' => 'critical', 'title' => "T$i", 'first_seen_at' => now(), 'last_seen_at' => now(), 'last_message' => 'm']);
            $service->notifyIncident($incident, 'opened');
        }

        $this->assertSame(2, OpsAlert::where('status', 'sent')->count());
        $this->assertSame(2, OpsAlert::where('status', 'skipped')->count());
    }

    // ── Exécution, signal de vie, parcours API ──────────────────────────────────────────────

    public function test_runner_records_results_and_skips_checks_that_are_not_due(): void
    {
        $registry = new class extends \App\Services\Ops\Monitor\CheckRegistry {
            public int $calls = 0;
            public function runnable(): array
            {
                return ['demo' => new MonitorCheck('demo', 'Démo', 'system', 'api', 'minor', 5, 1, function () { $this->calls++; return CheckResult::ok('ok'); })];
            }
        };
        $runner = new MonitorRunner($registry, $this->manager());

        $runner->run();
        $runner->run(); // pas encore dû
        $this->assertSame(1, $registry->calls);
        $this->assertSame(1, OpsCheckResult::where('check_key', 'demo')->count());

        $runner->run(null, true);
        $this->assertSame(2, $registry->calls);
    }

    public function test_a_check_that_throws_becomes_a_failure_not_a_crash(): void
    {
        $check = new MonitorCheck('boom', 'Boom', 'system', 'api', 'critical', 1, 1, fn () => throw new \RuntimeException('connexion refusée'));

        $result = $check->run();

        $this->assertSame('fail', $result->status);
        $this->assertStringContainsString('connexion refusée', $result->message);
    }

    public function test_heartbeat_reports_503_when_the_monitor_has_stopped_and_404_with_a_wrong_token(): void
    {
        config(['ops.heartbeat_token' => 'secret-token']);

        $this->getJson('/ops/heartbeat/mauvais')->assertNotFound();
        $this->getJson('/ops/heartbeat/secret-token')->assertStatus(503);

        \Illuminate\Support\Facades\Cache::forever(MonitorRunner::HEARTBEAT_KEY, now()->timestamp);
        $this->getJson('/ops/heartbeat/secret-token')->assertOk()->assertJsonPath('ok', true);

        \Illuminate\Support\Facades\Cache::forever(MonitorRunner::HEARTBEAT_KEY, now()->subMinutes(10)->timestamp);
        $this->getJson('/ops/heartbeat/secret-token')->assertStatus(503);
    }

    public function test_api_journey_logs_in_reads_the_screens_and_logs_out(): void
    {
        config(['ops.accounts.host' => ['email' => 'h@monitor.bosejour.invalid', 'password' => 'pw'], 'ops.api_url' => 'https://api.test']);
        Http::fake([
            'api.test/api/login' => Http::response(['token' => 'tok', 'user' => ['id' => 1]]),
            'api.test/api/logout' => Http::response(['ok' => true]),
            'api.test/api/*' => Http::response(['data' => []]),
        ]);

        $result = (new ApiJourney(new MonitorHttp()))->run('host');

        $this->assertSame('ok', $result->status);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/api/logout') && $r->hasHeader('Authorization', 'Bearer tok'));
    }

    public function test_api_journey_names_the_failing_screen(): void
    {
        config(['ops.accounts.admin' => ['email' => 'a@monitor.bosejour.invalid', 'password' => 'pw'], 'ops.api_url' => 'https://api.test']);
        Http::fake([
            'api.test/api/login' => Http::response(['token' => 'tok']),
            'api.test/api/logout' => Http::response(['ok' => true]),
            'api.test/api/admin/dashboard/stats' => Http::response(['message' => 'Server Error'], 500),
            'api.test/api/*' => Http::response(['data' => []]),
        ]);

        $result = (new ApiJourney(new MonitorHttp()))->run('admin');

        $this->assertSame('fail', $result->status);
        $this->assertStringContainsString('Statistiques (HTTP 500)', $result->message);
    }

    public function test_api_journey_fails_clearly_when_credentials_are_missing_or_login_refused(): void
    {
        config(['ops.accounts.traveler' => ['email' => '', 'password' => ''], 'ops.api_url' => 'https://api.test']);
        $this->assertStringContainsString('non configuré', (new ApiJourney(new MonitorHttp()))->run('traveler')->message);

        config(['ops.accounts.traveler' => ['email' => 't@x', 'password' => 'bad']]);
        Http::fake(['api.test/api/login' => Http::response(['message' => 'no'], 422)]);
        $this->assertStringContainsString('Connexion du compte de test', (new ApiJourney(new MonitorHttp()))->run('traveler')->message);
    }

    // ── Données de test invisibles, aucun message réel ──────────────────────────────────────

    public function test_the_synthetic_accommodation_is_hidden_from_the_public_and_visible_to_the_monitor(): void
    {
        config(['ops.monitor_secret' => 'monitor-secret']);
        $host = User::factory()->create(['role' => 'host']);
        $real = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published', 'name' => 'Hôtel réel']);
        $fake = Accommodation::factory()->create(['host_id' => $host->id, 'status' => 'published', 'name' => 'Établissement de test', 'is_synthetic' => true]);

        $public = collect($this->getJson('/api/accommodations?per_page=50')->assertOk()->json('data'))->pluck('name');
        $this->assertTrue($public->contains('Hôtel réel'));
        $this->assertFalse($public->contains('Établissement de test'));
        $this->getJson("/api/accommodations/{$fake->id}")->assertNotFound();

        $monitor = collect($this->withHeader('X-Ops-Monitor', 'monitor-secret')->getJson('/api/accommodations?per_page=50')->json('data'))->pluck('name');
        $this->assertTrue($monitor->contains('Établissement de test'));

        // Mauvais secret : toujours invisible.
        $wrong = collect($this->withHeader('X-Ops-Monitor', 'faux')->getJson('/api/accommodations?per_page=50')->json('data'))->pluck('name');
        $this->assertFalse($wrong->contains('Établissement de test'));
        $this->assertSame(2, Accommodation::withoutGlobalScopes()->count());
        $this->assertSame(1, Accommodation::count());
    }

    public function test_no_real_message_is_ever_sent_to_a_synthetic_number(): void
    {
        Setting::set('whatsapp_enabled', true, 'boolean');
        Setting::set('whatsapp_token', 't', 'string');
        Setting::set('whatsapp_phone_id', '1', 'string');
        Http::fake();

        $whatsapp = app(WhatsAppService::class);
        $this->assertTrue($whatsapp->sendTemplate('+2250000000001', 'x', ['a']));
        $this->assertTrue($whatsapp->sendText('+2250000000002', 'bonjour'));

        Http::assertNothingSent();
    }

    public function test_mail_to_synthetic_addresses_is_cancelled_but_real_addresses_still_receive(): void
    {
        $listener = new \App\Listeners\SuppressSyntheticMail();
        $make = fn (array $to) => new \Illuminate\Mail\Events\MessageSending(
            (new \Symfony\Component\Mime\Email())->from('a@b.c')->to(...$to)->subject('s')->text('t'),
            []
        );

        $this->assertFalse($listener->handle($make(['t@monitor.bosejour.invalid'])));
        $this->assertNull($listener->handle($make(['vrai@example.com'])));
        $this->assertNull($listener->handle($make(['t@monitor.bosejour.invalid', 'vrai@example.com'])));
    }

    public function test_seeding_creates_hidden_accounts_and_an_accommodation_that_cleanup_leaves_alone(): void
    {
        config(['ops.accounts' => [
            'traveler' => ['email' => 't@monitor.bosejour.invalid', 'password' => 'pw-t'],
            'host' => ['email' => 'h@monitor.bosejour.invalid', 'password' => 'pw-h'],
            'admin' => ['email' => 'a@monitor.bosejour.invalid', 'password' => 'pw-a'],
        ]]);

        $this->artisan('ops:seed-synthetic')->assertSuccessful();
        $this->artisan('ops:seed-synthetic')->assertSuccessful(); // idempotent

        $this->assertSame(3, User::where('is_synthetic', true)->count());
        $this->assertSame('admin', User::where('email', 'a@monitor.bosejour.invalid')->value('role'));
        $this->assertSame(1, Accommodation::withoutGlobalScopes()->where('is_synthetic', true)->count());
        $this->assertSame(0, Accommodation::count(), 'invisible par défaut');
        $this->assertSame(1, \App\Models\Room::count());

        $this->artisan('ops:cleanup-synthetic')->assertSuccessful();
        $this->assertSame(1, Accommodation::withoutGlobalScopes()->count());
    }

    // ── Pages ───────────────────────────────────────────────────────────────────────────────

    public function test_supervision_pages_are_reserved_to_admins_and_render(): void
    {
        $this->get('/ops/supervision')->assertRedirect('/ops/login');

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'web');
        $this->makeResult('fail', 'site.up');

        foreach (['/ops/supervision', '/ops/supervision/incidents', '/ops/supervision/erreurs', '/ops/supervision/reglages'] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_alert_settings_can_be_saved_and_tested(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
        Mail::fake();

        $this->post('/ops/supervision/reglages', ['enabled' => 1, 'phones' => "2250161133466\n2250700000009", 'emails' => 'moi@example.com'])->assertRedirect();

        $service = app(AlertService::class);
        $this->assertTrue($service->enabled());
        $this->assertSame(['2250161133466', '2250700000009'], $service->phones());
        $this->assertSame(['moi@example.com'], $service->emails());
    }
}
