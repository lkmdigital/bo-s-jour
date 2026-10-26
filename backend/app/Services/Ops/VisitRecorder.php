<?php

namespace App\Services\Ops;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Enregistre une page vue du site, sans cookie ni donnée personnelle : le visiteur n'est reconnu que par une
 * empreinte (IP + navigateur + jour + secret de l'application) qui change chaque jour et ne peut pas être inversée.
 * Les robots, le moniteur de supervision et les espaces connectés (/dashboard) ne sont jamais comptés.
 */
class VisitRecorder
{
    private const BOT_PATTERN = '/bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget|python|node-fetch|axios|okhttp|uptime|pingdom|gtmetrix|postman/i';

    public function record(Request $request, string $path, ?string $referrer): bool
    {
        $userAgent = (string) $request->userAgent();
        $path = $this->normalizePath($path);
        if ($userAgent === '' || preg_match(self::BOT_PATTERN, $userAgent) || $path === null || $this->isInternal($path)) {
            return false;
        }

        $day = now()->toDateString();
        $visitor = substr(hash_hmac('sha256', $request->ip() . '|' . $userAgent, config('app.key') . '|' . $day), 0, 32);

        // Double déclenchement (navigation rapide, mode strict de React) : la même page par le même visiteur n'est comptée qu'une fois toutes les 5 s.
        if (!Cache::add("visit:$visitor:" . md5($path), 1, 5)) {
            return false;
        }

        DB::table('ops_visits')->insert([
            'day' => $day,
            'visited_at' => now(),
            'visitor' => $visitor,
            'path' => $path,
            'referrer' => $this->referrerHost($referrer),
            'device' => $this->device($userAgent),
            'browser' => $this->browser($userAgent),
            'os' => $this->os($userAgent),
            'lang' => $this->language((string) $request->header('Accept-Language')),
        ]);

        return true;
    }

    public function normalizePath(string $path): ?string
    {
        $path = parse_url($path, PHP_URL_PATH) ?: '';
        if ($path === '' || $path[0] !== '/') {
            return null;
        }

        return mb_substr(rtrim($path, '/') ?: '/', 0, 191);
    }

    private function isInternal(string $path): bool
    {
        return (bool) preg_match('#^/(dashboard|ops|api|_next)(/|$)#', $path);
    }

    private function referrerHost(?string $referrer): ?string
    {
        $host = strtolower((string) parse_url((string) $referrer, PHP_URL_HOST));
        $host = preg_replace('/^www\./', '', $host);
        if ($host === '') {
            return null;
        }
        $own = array_map(fn ($u) => preg_replace('/^www\./', '', strtolower((string) parse_url($u, PHP_URL_HOST))), [config('ops.site_url'), config('ops.api_url')]);

        return in_array($host, $own, true) ? null : mb_substr($host, 0, 120);
    }

    public function device(string $ua): string
    {
        if (preg_match('/ipad|tablet|kindle|silk|(android(?!.*mobile))/i', $ua)) {
            return 'tablet';
        }

        return preg_match('/mobi|iphone|ipod|android|windows phone/i', $ua) ? 'mobile' : 'desktop';
    }

    public function browser(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/SamsungBrowser/i', $ua) => 'Samsung',
            (bool) preg_match('/edg(e|a|ios)?\//i', $ua) => 'Edge',
            (bool) preg_match('/opr\/|opera/i', $ua) => 'Opera',
            (bool) preg_match('/firefox|fxios/i', $ua) => 'Firefox',
            (bool) preg_match('/chrome|crios/i', $ua) => 'Chrome',
            (bool) preg_match('/safari/i', $ua) => 'Safari',
            default => 'Autre',
        };
    }

    public function os(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/android/i', $ua) => 'Android',
            (bool) preg_match('/iphone|ipad|ipod/i', $ua) => 'iOS',
            (bool) preg_match('/windows/i', $ua) => 'Windows',
            (bool) preg_match('/mac os|macintosh/i', $ua) => 'macOS',
            (bool) preg_match('/linux|x11|cros/i', $ua) => 'Linux',
            default => 'Autre',
        };
    }

    private function language(string $acceptLanguage): ?string
    {
        return preg_match('/^([a-z]{2})/i', trim($acceptLanguage), $m) ? strtolower($m[1]) : null;
    }
}
