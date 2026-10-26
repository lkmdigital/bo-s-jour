<?php

namespace App\Services\Ops\Monitor;

use Closure;

/**
 * Un contrôle de supervision : identité (clé, libellé, profil), gravité de l'incident s'il échoue,
 * fréquence, nombre d'échecs de suite avant d'alerter, et la fonction qui le réalise.
 */
final class MonitorCheck
{
    /**
     * @param string $severity critical | major | minor
     */
    public function __construct(
        public readonly string $key,
        public readonly string $label,
        public readonly string $profile,   // system | traveler | host | admin
        public readonly string $kind,      // api | browser | logs | business
        public readonly string $severity,
        public readonly int $intervalMinutes,
        public readonly int $failuresBeforeAlert,
        private readonly Closure $callback,
    ) {}

    public function run(): CheckResult
    {
        $start = microtime(true);
        try {
            $result = ($this->callback)();
        } catch (\Throwable $e) {
            $result = CheckResult::fail('Exception : ' . mb_substr($e->getMessage(), 0, 300), ['exception' => get_class($e)]);
        }
        $result->durationMs = (int) round((microtime(true) - $start) * 1000);

        return $result;
    }
}
