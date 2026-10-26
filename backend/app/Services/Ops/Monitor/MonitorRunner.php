<?php

namespace App\Services\Ops\Monitor;

use App\Models\Ops\OpsCheckResult;
use Illuminate\Support\Facades\Cache;

/**
 * Exécute les contrôles arrivés à échéance, enregistre chaque résultat et laisse IncidentManager décider
 * des incidents. Chaque passage laisse aussi un « signal de vie » lu par l'adresse de supervision externe.
 */
class MonitorRunner
{
    public const HEARTBEAT_KEY = 'ops:monitor:last_run';

    public function __construct(private CheckRegistry $registry, private IncidentManager $incidents) {}

    /**
     * @param array<int,string>|null $only clés à exécuter (null = tous les contrôles dus)
     * @return array<string,OpsCheckResult>
     */
    public function run(?array $only = null, bool $force = false): array
    {
        Cache::forever(self::HEARTBEAT_KEY, now()->timestamp);

        $results = [];
        foreach ($this->registry->runnable() as $key => $check) {
            if ($only !== null && !in_array($key, $only, true)) {
                continue;
            }
            if (!$force && !$this->isDue($check)) {
                continue;
            }
            $results[$key] = $this->record($check, $check->run());
        }

        return $results;
    }

    /** Enregistre un résultat (utilisé aussi par les parcours navigateur) et met à jour les incidents. */
    public function record(MonitorCheck $check, CheckResult $result): OpsCheckResult
    {
        $row = OpsCheckResult::create([
            'check_key' => $check->key,
            'profile' => $check->profile,
            'kind' => $check->kind,
            'status' => $result->status,
            'duration_ms' => $result->durationMs,
            'message' => mb_substr($result->message, 0, 2000),
            'details' => $result->details ?: null,
            'screenshot' => $result->screenshot,
        ]);
        $this->incidents->process($check, $row);

        return $row;
    }

    private function isDue(MonitorCheck $check): bool
    {
        $last = OpsCheckResult::where('check_key', $check->key)->latest('id')->value('created_at');

        // Marge de 20 s : le planificateur lance la commande à la minute, une exécution ne doit pas être sautée d'un cheveu.
        return !$last || $last->lt(now()->subMinutes($check->intervalMinutes)->addSeconds(20));
    }

    public static function lastRunAt(): ?int
    {
        return Cache::get(self::HEARTBEAT_KEY);
    }
}
