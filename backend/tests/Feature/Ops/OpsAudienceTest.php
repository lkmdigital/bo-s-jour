<?php

namespace Tests\Feature\Ops;

use App\Models\User;
use App\Services\Ops\AudienceReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Mesure d'audience interne : enregistrement sans cookie, filtrage des robots et des espaces connectés, chiffres de la page Ops. */
class OpsAudienceTest extends TestCase
{
    use RefreshDatabase;

    private const PHONE = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
    private const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

    private function track(string $path, string $ua = self::PHONE, ?string $referrer = null, array $headers = [])
    {
        $server = ['CONTENT_TYPE' => 'text/plain', 'HTTP_USER_AGENT' => $ua];
        foreach ($headers as $name => $value) {
            $server['HTTP_' . strtoupper(str_replace('-', '_', $name))] = $value;
        }

        return $this->call('POST', '/api/track', [], [], [], $server, json_encode(['path' => $path, 'referrer' => $referrer]));
    }

    /**
     * Régression : depuis le passage aux cookies de session, toute requête venant du site est « stateful » pour Sanctum,
     * donc soumise au CSRF. Laravel désactive ce contrôle pendant les tests, on vérifie donc directement l'exclusion :
     * sans elle, chaque visite réelle recevait un 419 et la page Audience restait vide.
     */
    public function test_the_visit_endpoint_is_exempt_from_csrf_validation(): void
    {
        $middleware = app(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
        $inExcept = new \ReflectionMethod($middleware, 'inExceptArray');

        $track = \Illuminate\Http\Request::create('/api/track', 'POST');
        $other = \Illuminate\Http\Request::create('/api/bookings', 'POST');

        $this->assertTrue($inExcept->invoke($middleware, $track), 'api/track doit échapper au CSRF');
        $this->assertFalse($inExcept->invoke($middleware, $other), 'les autres routes restent protégées');
    }

    public function test_a_page_view_is_recorded_with_device_browser_system_and_language(): void
    {
        $this->track('/accommodations/12?utm=x', self::PHONE, 'https://www.google.com/search?q=bosejour', ['Accept-Language' => 'fr-FR,fr;q=0.9'])->assertNoContent();

        $row = DB::table('ops_visits')->first();
        $this->assertSame('/accommodations/12', $row->path, 'les paramètres de l\'adresse ne sont pas conservés');
        $this->assertSame('mobile', $row->device);
        $this->assertSame('Chrome', $row->browser);
        $this->assertSame('Android', $row->os);
        $this->assertSame('google.com', $row->referrer);
        $this->assertSame('fr', $row->lang);
    }

    public function test_robots_monitoring_connected_spaces_and_own_site_referrers_are_not_counted_or_kept(): void
    {
        config(['ops.site_url' => 'https://bosejour.ci', 'ops.api_url' => 'https://api.bosejour.ci']);

        $this->track('/', 'Googlebot/2.1 (+http://www.google.com/bot.html)')->assertNoContent();
        $this->track('/', 'Mozilla/5.0 Chrome/124.0 Safari/537.36 bosejour-monitor/1.0')->assertNoContent();
        $this->track('/dashboard/admin')->assertNoContent();
        $this->track('/dashboard/host/reservations')->assertNoContent();
        $this->assertSame(0, DB::table('ops_visits')->count());

        $this->track('/accommodations', self::DESKTOP, 'https://bosejour.ci/')->assertNoContent();
        $this->assertNull(DB::table('ops_visits')->value('referrer'), 'la navigation interne n\'est pas une source');
    }

    public function test_garbage_input_never_errors_and_the_same_page_twice_in_a_row_counts_once(): void
    {
        $this->call('POST', '/api/track', [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_USER_AGENT' => self::PHONE], 'pas du json')->assertNoContent();
        $this->call('POST', '/api/track', [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_USER_AGENT' => self::PHONE], json_encode(['path' => 123]))->assertNoContent();
        $this->assertSame(0, DB::table('ops_visits')->count());

        $this->track('/')->assertNoContent();
        $this->track('/')->assertNoContent();
        $this->assertSame(1, DB::table('ops_visits')->count());
    }

    public function test_visitors_are_hashed_and_no_ip_or_user_agent_is_stored(): void
    {
        $this->track('/')->assertNoContent();

        $row = (array) DB::table('ops_visits')->first();
        $this->assertSame(32, strlen($row['visitor']));
        $this->assertStringNotContainsString('127.0.0.1', implode('|', $row));
        $this->assertStringNotContainsString('Pixel', implode('|', $row));
    }

    public function test_report_counts_visitors_and_views_per_day_and_compares_with_the_previous_period(): void
    {
        $insert = fn (string $day, string $visitor, string $path) => DB::table('ops_visits')->insert(['day' => $day, 'visited_at' => $day . ' 10:00:00', 'visitor' => $visitor, 'path' => $path, 'referrer' => null, 'device' => 'mobile', 'browser' => 'Chrome', 'os' => 'Android', 'lang' => 'fr']);
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();
        foreach ([['a', '/'], ['a', '/accommodations'], ['b', '/']] as [$v, $p]) {
            $insert($today, $v, $p);
        }
        $insert($yesterday, 'c', '/');

        $report = (new AudienceReport())->build('today');

        $this->assertSame(2, $report['current']['visitors']);
        $this->assertSame(3, $report['current']['views']);
        $this->assertSame(1.5, $report['current']['per_visitor']);
        $this->assertSame(1, $report['previous']['visitors']);
        $this->assertSame(100.0, $report['change']['visitors']);
        $this->assertSame('/', $report['top_pages'][0]->path);
        $this->assertSame(100.0, $report['devices'][0]['share']);
        $this->assertCount(7, (new AudienceReport())->build('7d')['daily']);
    }

    public function test_audience_page_is_reserved_to_admins_and_renders(): void
    {
        $this->get('/ops/audience')->assertRedirect('/ops/login');

        $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
        $this->track('/', self::DESKTOP, 'https://facebook.com/');
        foreach (['today', '7d', '30d', '90d'] as $period) {
            $this->get('/ops/audience?period=' . $period)->assertOk()->assertSee('Audience du site');
        }
        $this->get('/ops')->assertOk()->assertSee('visiteur(s) aujourd');
    }
}
