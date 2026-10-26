<?php

namespace Tests\Feature\Ops;

use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;
use App\Models\Setting;
use App\Services\Ops\Monitor\CheckRegistry;
use App\Services\Ops\Monitor\DigestBuilder;
use App\Services\Ops\Monitor\LogErrorScanner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

/** Contrôles de la supervision : réponses du site/API simulées, journaux, résumé, moteur de parcours. */
class OpsChecksTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ops.site_url' => 'https://site.test', 'ops.api_url' => 'https://api.test']);
    }

    /** Remplace les réponses simulées (un second $this->fakeHttp() s'ajouterait aux premières au lieu de les remplacer). */
    private function fakeHttp(array $map): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::fake($map);
    }

    private function runCheck(string $key)
    {
        return (new CheckRegistry())->all()[$key]->run();
    }

    public function test_site_check_passes_on_a_normal_home_page_and_fails_on_an_error_or_unexpected_content(): void
    {
        $this->fakeHttp(['site.test/*' => Http::response('<html><title>boséjour - Votre séjour</title></html>', 200)]);
        $this->assertSame('ok', $this->runCheck('site.up')->status);

        $this->fakeHttp(['site.test/*' => Http::response('Bad gateway', 502)]);
        $this->assertSame('fail', $this->runCheck('site.up')->status);

        $this->fakeHttp(['site.test/*' => Http::response('<html>page par défaut nginx</html>', 200)]);
        $result = $this->runCheck('site.up');
        $this->assertSame('fail', $result->status);
        $this->assertStringContainsString('contenu est inattendu', $result->message);
    }

    public function test_api_and_search_checks(): void
    {
        $this->fakeHttp([
            'api.test/api/settings/public' => Http::response(['app_name' => 'boséjour']),
            'api.test/api/accommodations*' => Http::response(['data' => [['id' => 1]]]),
        ]);
        $this->assertSame('ok', $this->runCheck('api.up')->status);
        $this->assertSame('ok', $this->runCheck('public.search')->status);

        $this->fakeHttp(['api.test/*' => Http::response(['message' => 'Server Error'], 500)]);
        $this->assertSame('fail', $this->runCheck('api.up')->status);
        $this->assertSame('fail', $this->runCheck('public.search')->status);

        $this->fakeHttp(['api.test/api/accommodations*' => Http::response(['data' => []])]);
        $this->assertSame('warn', $this->runCheck('public.search')->status, 'aucun établissement publié : avertissement');
    }

    public function test_listing_check_fails_when_the_price_calculation_breaks(): void
    {
        $this->fakeHttp([
            'api.test/api/accommodations?per_page=1*' => Http::response(['data' => [['id' => 7]]]),
            'api.test/api/accommodations/7/rooms' => Http::response(['data' => [['id' => 3]]]),
            'api.test/api/accommodations/7/unavailable-dates' => Http::response([]),
            'api.test/api/accommodations/7/price-preview*' => Http::response(['message' => 'Server Error'], 500),
            'api.test/api/accommodations/7' => Http::response(['name' => 'Hôtel']),
        ]);

        $result = $this->runCheck('public.listing');

        $this->assertSame('fail', $result->status);
        $this->assertStringContainsString('calcul du prix', $result->message);
    }

    /** Incident du 2026-10-16 : « WhatsApp activé » avait rendu la vérification obligatoire sans modèle d'authentification approuvé. */
    public function test_it_detects_a_mandatory_phone_verification_without_an_approved_template(): void
    {
        Setting::set('whatsapp_token', 'tok', 'string');
        config(['ops.whatsapp_waba_id' => '999']);
        $this->fakeHttp([
            'api.test/api/settings/public' => Http::response(['whatsapp_verification_enabled' => true]),
            'graph.facebook.com/*' => Http::response(['data' => []]),
        ]);

        $result = $this->runCheck('business.verification_flag');

        $this->assertSame('fail', $result->status);
        $this->assertStringContainsString('ne peuvent plus réserver', $result->message);

        $this->fakeHttp([
            'api.test/api/settings/public' => Http::response(['whatsapp_verification_enabled' => true]),
            'graph.facebook.com/*' => Http::response(['data' => [['name' => 'bosejour_code_verification', 'status' => 'APPROVED']]]),
        ]);
        $this->assertSame('ok', $this->runCheck('business.verification_flag')->status);

        $this->fakeHttp(['api.test/api/settings/public' => Http::response(['whatsapp_verification_enabled' => false])]);
        $this->assertSame('ok', $this->runCheck('business.verification_flag')->status);
    }

    public function test_stuck_payments_and_expired_requests_ignore_synthetic_users(): void
    {
        $real = \App\Models\User::factory()->create();
        $fake = \App\Models\User::factory()->create(['is_synthetic' => true]);
        $accommodation = \App\Models\Accommodation::factory()->create();
        foreach ([$real, $fake] as $user) {
            $booking = \App\Models\Booking::factory()->create(['user_id' => $user->id, 'accommodation_id' => $accommodation->id, 'status' => 'awaiting_host_confirmation', 'expires_at' => now()->subHours(2)]);
            \Illuminate\Support\Facades\DB::table('payments')->insert(['booking_id' => $booking->id, 'user_id' => $user->id, 'amount' => 1000, 'purpose' => 'full', 'status' => 'pending', 'created_at' => now()->subHours(2), 'updated_at' => now()]);
        }

        $this->assertSame(['paiements' => 1], $this->runCheck('business.payments_stuck')->details);
        $this->assertSame(['demandes' => 1], $this->runCheck('business.requests_expired')->details);
    }

    // ── Journaux ────────────────────────────────────────────────────────────────────────────

    private function logFile(array $lines): string
    {
        $path = tempnam(sys_get_temp_dir(), 'ops-log');
        file_put_contents($path, implode("\n", $lines) . "\n");

        return $path;
    }

    public function test_log_scanner_groups_identical_errors_and_ignores_old_or_low_level_lines(): void
    {
        $now = now()->format('Y-m-d H:i:s');
        $old = now()->subHours(5)->format('Y-m-d H:i:s');
        $path = $this->logFile([
            "[$now] production.ERROR: SMS.to send failed {\"status\":400,\"to\":\"+2250161133466\"}",
            "[$now] production.ERROR: SMS.to send failed {\"status\":400,\"to\":\"+2250709779922\"}",
            "[$now] production.ERROR: Erreur n°123 sur la réservation 456",
            "[$now] production.ERROR: Erreur n°789 sur la réservation 12",
            "[$now] production.INFO: Profil mis à jour",
            "[$old] production.ERROR: Vieille erreur",
            '#0 /var/www/app.php(12): trace',
        ]);

        $groups = (new LogErrorScanner($path))->scan(30);
        unlink($path);

        $this->assertCount(2, $groups);
        $this->assertSame(2, $groups[0]['count']);
        $this->assertSame('sms', $groups[0]['category'] === 'sms' ? 'sms' : $groups[1]['category']);
        $this->assertContains('Erreur n°# sur la réservation #', array_column($groups, 'signature'));
    }

    public function test_sms_check_alerts_when_failures_pile_up(): void
    {
        $now = now()->format('Y-m-d H:i:s');
        $path = $this->logFile(array_fill(0, 4, "[$now] production.ERROR: SMS.to send failed {\"status\":400}"));
        $this->app->bind(LogErrorScanner::class, fn () => new LogErrorScanner($path));

        $result = (new CheckRegistry(logs: new LogErrorScanner($path)))->all()['logs.sms']->run();
        unlink($path);

        $this->assertSame('fail', $result->status);
        $this->assertStringContainsString('SMS', $result->message);
    }

    // ── Résumé et moteur de parcours ────────────────────────────────────────────────────────

    public function test_digest_reports_availability_incidents_and_real_activity(): void
    {
        OpsCheckResult::create(['check_key' => 'site.up', 'profile' => 'system', 'kind' => 'api', 'status' => 'ok', 'duration_ms' => 5]);
        OpsCheckResult::create(['check_key' => 'site.up', 'profile' => 'system', 'kind' => 'api', 'status' => 'fail', 'duration_ms' => 5]);
        OpsIncident::create(['check_key' => 'site.up', 'profile' => 'system', 'severity' => 'critical', 'title' => 'Site web en ligne', 'first_seen_at' => now()->subHour(), 'last_seen_at' => now(), 'last_message' => 'x']);

        $digest = (new DigestBuilder(new LogErrorScanner('/nonexistent')))->build();

        $this->assertSame('CRITIQUE', $digest['level']);
        $this->assertStringContainsString('1 incident(s) en cours', $digest['headline']);
        $this->assertStringContainsString('Plateforme et serveur : 50 % de contrôles OK (2)', $digest['detail']);
        $this->assertStringContainsString('[critique] Site web en ligne', $digest['detail']);
        $this->assertStringContainsString('0 demande(s) de réservation', $digest['detail']);
    }

    public function test_browser_journey_command_records_the_report_and_survives_a_missing_engine(): void
    {
        $report = ['status' => 'fail', 'message' => 'Étape « Chambre » : introuvable', 'screenshot' => 'traveler-x.png', 'steps' => [['name' => 'Accueil', 'ms' => 12]], 'serverErrors' => [], 'pageErrors' => [], 'data' => []];
        Process::fake(['*' => Process::result("bruit\n__OPS_RESULT__" . json_encode($report) . "\n")]);

        $this->artisan('ops:browser-journeys', ['profile' => 'traveler', '--no-cleanup' => true])->assertSuccessful();
        $row = OpsCheckResult::where('check_key', 'browser.traveler')->latest('id')->first();
        $this->assertSame('fail', $row->status);
        $this->assertSame('traveler-x.png', $row->screenshot);

        Process::fake(['*' => Process::result('', "Error: Cannot find module 'playwright'", 1)]);
        $this->artisan('ops:browser-journeys', ['profile' => 'host', '--no-cleanup' => true])->assertSuccessful();
        $row = OpsCheckResult::where('check_key', 'browser.host')->latest('id')->first();
        $this->assertSame('warn', $row->status, 'moteur absent : avertissement, pas une panne du site');
        $this->assertStringContainsString('playwright', $row->message);
    }

    public function test_digest_command_prints_without_sending(): void
    {
        $this->artisan('ops:digest', ['--print' => true])->expectsOutputToContain('Disponibilité')->assertSuccessful();
    }
}
