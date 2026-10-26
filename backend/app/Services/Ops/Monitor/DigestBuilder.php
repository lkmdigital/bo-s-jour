<?php

namespace App\Services\Ops\Monitor;

use App\Models\Ops\OpsCheckResult;
use App\Models\Ops\OpsIncident;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Construit le résumé de la supervision (quotidien, ou bilan hebdomadaire le lundi) : disponibilité par profil,
 * incidents ouverts et passés, erreurs les plus fréquentes et activité réelle de la plateforme.
 */
class DigestBuilder
{
    private const PROFILES = ['system' => 'Plateforme et serveur', 'traveler' => 'Voyageur', 'host' => 'Partenaire', 'admin' => 'Administrateur'];

    public function __construct(private LogErrorScanner $logs = new LogErrorScanner()) {}

    /** @return array{level:string,headline:string,detail:string} */
    public function build(bool $weekly = false, ?Carbon $now = null): array
    {
        $now ??= now();
        $since = $weekly ? $now->copy()->subDays(7) : $now->copy()->subDay();
        $label = $weekly ? 'la semaine' : '24 h';

        $open = OpsIncident::where('status', 'open')->get();
        $opened = OpsIncident::where('first_seen_at', '>=', $since)->get();
        $resolved = $opened->where('status', 'resolved');

        $lines = [];
        $lines[] = "Disponibilité sur $label :";
        foreach (self::PROFILES as $profile => $name) {
            $total = OpsCheckResult::where('profile', $profile)->where('created_at', '>=', $since)->count();
            $okCount = OpsCheckResult::where('profile', $profile)->where('created_at', '>=', $since)->where('status', 'ok')->count();
            $lines[] = '• ' . $name . ' : ' . ($total ? round($okCount / $total * 100, 1) . ' % de contrôles OK (' . $total . ')' : 'aucun contrôle');
        }

        $lines[] = '';
        $lines[] = "Incidents sur $label : " . $opened->count() . ' ouvert(s), ' . $resolved->count() . ' résolu(s)' . ($resolved->count() ? ', durée moyenne ' . $this->averageMinutes($resolved) : '') . '.';
        if ($open->isNotEmpty()) {
            $lines[] = 'En cours :';
            foreach ($open->sortBy('first_seen_at')->take(6) as $incident) {
                $lines[] = '• [' . $this->severityLabel($incident->severity) . '] ' . $incident->title . ' — depuis ' . $incident->first_seen_at->setTimezone('Africa/Abidjan')->format('d/m H:i');
            }
        } else {
            $lines[] = 'Aucun incident en cours.';
        }

        $errors = array_slice($this->logs->scan($weekly ? 10080 : 1440), 0, 3);
        if ($errors) {
            $lines[] = '';
            $lines[] = 'Erreurs les plus fréquentes :';
            foreach ($errors as $e) {
                $lines[] = '• ' . $e['count'] . '× ' . mb_substr($e['signature'], 0, 110);
            }
        }

        $lines[] = '';
        $lines[] = 'Activité réelle (hors comptes de test) :';
        foreach ($this->activity($since) as $line) {
            $lines[] = '• ' . $line;
        }

        $critical = $open->contains('severity', 'critical');
        $level = $critical ? 'CRITIQUE' : ($open->isNotEmpty() ? 'IMPORTANT' : 'RÉSUMÉ');
        $headline = ($weekly ? 'Bilan de la semaine' : 'Résumé quotidien') . ' — ' . $now->setTimezone('Africa/Abidjan')->format('d/m/Y') . ($open->isEmpty() ? ' — tout va bien' : ' — ' . $open->count() . ' incident(s) en cours');

        return ['level' => $level, 'headline' => $headline, 'detail' => implode("\n", $lines)];
    }

    /** @return array<int,string> */
    private function activity(Carbon $since): array
    {
        $real = fn ($query, string $table) => $query->leftJoin('users', 'users.id', '=', "$table.user_id")
            ->where(fn ($q) => $q->whereNull('users.is_synthetic')->orWhere('users.is_synthetic', false));

        $requests = $real(DB::table('bookings')->where('bookings.created_at', '>=', $since), 'bookings')->count();
        $payments = $real(DB::table('payments')->where('payments.status', 'completed')->where('payments.created_at', '>=', $since), 'payments');
        $paidCount = (clone $payments)->count();
        $paidAmount = (float) (clone $payments)->sum('payments.amount');
        $users = DB::table('users')->where('created_at', '>=', $since)->where(fn ($q) => $q->whereNull('is_synthetic')->orWhere('is_synthetic', false))->count();

        return [
            "$requests demande(s) de réservation",
            "$paidCount paiement(s) réussi(s) pour " . number_format($paidAmount, 0, ',', ' ') . ' FCFA',
            "$users nouveau(x) compte(s)",
        ];
    }

    private function averageMinutes($resolved): string
    {
        $avg = (int) round($resolved->avg(fn ($i) => $i->first_seen_at->diffInMinutes($i->resolved_at)));

        return $avg >= 90 ? round($avg / 60, 1) . ' h' : $avg . ' min';
    }

    private function severityLabel(string $severity): string
    {
        return ['critical' => 'critique', 'major' => 'important', 'minor' => 'mineur'][$severity] ?? $severity;
    }
}
