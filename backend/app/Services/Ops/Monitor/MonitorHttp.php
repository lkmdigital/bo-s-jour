<?php

namespace App\Services\Ops\Monitor;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Appels HTTP du moniteur : mêmes adresses que les visiteurs (nginx, certificat, cache compris),
 * avec l'en-tête secret qui rend l'établissement de test visible et un User-Agent reconnaissable.
 */
class MonitorHttp
{
    public function site(string $path = '/'): string
    {
        return config('ops.site_url') . $path;
    }

    public function api(string $path): string
    {
        return config('ops.api_url') . '/api' . $path;
    }

    private function client(?string $token = null, int $timeout = 15): PendingRequest
    {
        $request = Http::withHeaders(array_filter([
            'X-Ops-Monitor' => (string) config('ops.monitor_secret'),
            'User-Agent' => 'bosejour-monitor/1.0',
        ]))->acceptJson()->timeout($timeout)->withoutRedirecting();

        return $token ? $request->withToken($token) : $request;
    }

    public function get(string $url, array $query = [], ?string $token = null, int $timeout = 15): Response
    {
        return $this->client($token, $timeout)->get($url, $query);
    }

    public function post(string $url, array $data = [], ?string $token = null, int $timeout = 15): Response
    {
        return $this->client($token, $timeout)->asJson()->post($url, $data);
    }
}
