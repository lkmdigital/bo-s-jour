<?php

namespace App\Services\Ops\Monitor;

/** Résultat d'un contrôle : ok, warn (à surveiller) ou fail (en panne). */
final class CheckResult
{
    public function __construct(
        public readonly string $status,
        public readonly string $message = '',
        public readonly array $details = [],
        public readonly ?string $screenshot = null,
        public int $durationMs = 0,
    ) {}

    public static function ok(string $message = 'OK', array $details = []): self
    {
        return new self('ok', $message, $details);
    }

    public static function warn(string $message, array $details = []): self
    {
        return new self('warn', $message, $details);
    }

    public static function fail(string $message, array $details = [], ?string $screenshot = null): self
    {
        return new self('fail', $message, $details, $screenshot);
    }

    public function isOk(): bool
    {
        return $this->status === 'ok';
    }
}
