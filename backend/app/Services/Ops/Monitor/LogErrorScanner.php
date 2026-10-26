<?php

namespace App\Services\Ops\Monitor;

use Carbon\Carbon;

/**
 * Parcourt la fin de laravel.log et regroupe les erreurs par « signature » (message sans les nombres,
 * identifiants, adresses et numéros qui varient), avec leur nombre, leur dernière date et un exemple.
 */
class LogErrorScanner
{
    /** Octets relus à la fin du fichier (suffisant pour plusieurs heures de journal courant). */
    private const TAIL_BYTES = 3_000_000;

    private const CATEGORIES = [
        'sms' => '/sms\.?to|sms/i',
        'whatsapp' => '/whatsapp/i',
        'ai' => '/assistant ia|anthropic/i',
        'payment' => '/malia|paiement|payment/i',
        'mail' => '/mail|smtp/i',
        'database' => '/sqlstate|database|deadlock/i',
    ];

    public function __construct(private ?string $path = null)
    {
        $this->path ??= storage_path('logs/laravel.log');
    }

    /**
     * @param array<int,string> $levels
     * @return array<int,array{signature:string,category:string,level:string,count:int,last_seen:string,sample:string}>
     */
    public function scan(int $windowMinutes, array $levels = ['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY']): array
    {
        if (!is_file($this->path) || !is_readable($this->path)) {
            return [];
        }

        $size = filesize($this->path);
        $start = max(0, $size - self::TAIL_BYTES);
        $handle = fopen($this->path, 'rb');
        if ($handle === false) {
            return [];
        }
        fseek($handle, $start);
        $chunk = (string) fread($handle, $size - $start);
        fclose($handle);

        $since = Carbon::now()->subMinutes($windowMinutes);
        $groups = [];
        foreach (explode("\n", $chunk) as $line) {
            if (!preg_match('/^\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})\]\s+\S+\.(\w+):\s?(.*)$/su', $line, $m)) {
                continue; // suite d'une trace d'exception, ligne tronquée par la coupe, etc.
            }
            $level = strtoupper($m[2]);
            if (!in_array($level, $levels, true)) {
                continue;
            }
            try {
                $when = Carbon::parse($m[1], config('app.timezone'));
            } catch (\Throwable) {
                continue;
            }
            if ($when->lt($since)) {
                continue;
            }
            $signature = $this->signature($m[3]);
            $key = $level . '|' . $signature;
            $groups[$key] ??= [
                'signature' => $signature,
                'category' => $this->category($m[3]),
                'level' => $level,
                'count' => 0,
                'last_seen' => $m[1],
                'sample' => mb_substr($m[3], 0, 300),
            ];
            $groups[$key]['count']++;
            $groups[$key]['last_seen'] = $m[1];
        }

        usort($groups, fn ($a, $b) => $b['count'] <=> $a['count']);

        return array_values($groups);
    }

    public function signature(string $message): string
    {
        // Le contexte JSON final (identifiants, corps de réponse…) varie à chaque occurrence.
        $message = preg_replace('/\s\{".*$/su', '', $message) ?? $message;
        $message = preg_replace('/\([^)]*Connection:[^)]*\)/u', '', $message) ?? $message;
        $message = preg_replace('/[\w.+-]+@[\w-]+\.[\w.-]+/u', '<email>', $message) ?? $message;
        $message = preg_replace('/\+?\d[\d\s().-]{7,}\d/u', '<n°>', $message) ?? $message;
        $message = preg_replace('/\b[0-9a-f]{12,}\b/i', '<id>', $message) ?? $message;
        $message = preg_replace('/\d+/u', '#', $message) ?? $message;

        return mb_substr(trim($message), 0, 140);
    }

    private function category(string $message): string
    {
        foreach (self::CATEGORIES as $name => $regex) {
            if (preg_match($regex, $message)) {
                return $name;
            }
        }

        return 'other';
    }
}
