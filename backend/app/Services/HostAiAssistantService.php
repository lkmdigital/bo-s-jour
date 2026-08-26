<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Assistant IA Partenaire (doc client "MODULE IA BOSÉJOUR" §2.1 — "Assistant
 * Conversationnel" : le partenaire interroge la gestion de son établissement
 * en langage naturel). V1 restreinte aux 3 questions d'exemple du doc.
 *
 * Chaque outil est scopé côté serveur à l'hôte authentifié via hostScopeId()
 * — jamais un paramètre que le modèle pourrait fournir — donc structurellement
 * impossible pour un hôte de lire les données d'un autre par ce biais, quelle
 * que soit la question posée.
 *
 * Génération de contenu, traduction, SEO, tarification intelligente,
 * prévisions, réponses assistées, analyse des avis (§2.2 à §2.14 du doc) :
 * hors périmètre de cette V1, à construire ensuite.
 */
class HostAiAssistantService extends AiAssistantService
{
    public function __construct(private readonly User $host)
    {
    }

    protected function logContext(): string
    {
        return 'HostAiAssistantService(host_id=' . $this->host->hostScopeId() . ')';
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
Tu es l'assistant IA partenaire de la plateforme bo séjour (hébergements en
Côte d'Ivoire). Réponds aux questions de l'hôte UNIQUEMENT à partir des
résultats des outils fournis, qui interrogent les données réelles de SES
propres établissements — jamais celles d'un autre partenaire.

Règles :
- N'invente jamais de chiffre ou de nom de chambre/établissement absent des résultats d'outils.
- Si la question sort du périmètre des outils disponibles, dis-le clairement
  plutôt que d'improviser une réponse.
- Réponds en français, de façon concise et directe (quelques phrases, pas de
  longue analyse sauf si la question le demande explicitement).
- Les montants sont en FCFA.
PROMPT;
    }

    protected function toolDefinitions(): array
    {
        return [
            [
                'name' => 'get_occupancy_rate',
                'description' => "Taux d'occupation de l'hôte sur les 30 derniers jours, tous établissements confondus.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_next_payout',
                'description' => "Solde actuellement disponible pour retrait (commissions déjà libérées par la plateforme, pas encore versées à l'hôte).",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
            [
                'name' => 'get_most_profitable_room',
                'description' => "Classe les chambres de l'hôte par chiffre d'affaires généré (réservations confirmées), de la plus rentable à la moins rentable.",
                'inputSchema' => ['type' => 'object', 'properties' => new \stdClass()],
            ],
        ];
    }

    protected function executeTool(string $name, array $input): string
    {
        return match ($name) {
            'get_occupancy_rate' => $this->getOccupancyRate(),
            'get_next_payout' => $this->getNextPayout(),
            'get_most_profitable_room' => $this->getMostProfitableRoom(),
            default => json_encode(['error' => "Outil inconnu : {$name}"]),
        };
    }

    /**
     * Même formule que AnalyticsController::hostDashboard() (30 derniers
     * jours) — pour que le chiffre donné par l'assistant corresponde
     * exactement à celui affiché sur le tableau de bord Statistiques.
     */
    private function getOccupancyRate(): string
    {
        $hostId = $this->host->hostScopeId();

        $totalNights = Booking::whereHas('accommodation', function ($q) use ($hostId) {
                $q->where('host_id', $hostId);
            })
            ->where('status', 'confirmed')
            ->where('check_in', '>=', Carbon::now()->subDays(30))
            ->get()
            ->sum(fn ($b) => Carbon::parse($b->check_in)->diffInDays(Carbon::parse($b->check_out)));

        $totalRooms = Accommodation::where('host_id', $hostId)->withCount('rooms')->get()->sum('rooms_count');
        $availableNights = $totalRooms * 30;
        $occupancyRate = $availableNights > 0 ? ($totalNights / $availableNights) * 100 : 0;

        return json_encode([
            'period_days' => 30,
            'total_rooms' => $totalRooms,
            'occupancy_rate_percent' => round($occupancyRate, 1),
        ]);
    }

    /**
     * Même requête que HostWithdrawalController::availableBalance() — le
     * chiffre donné par l'assistant doit correspondre exactement au solde
     * affiché sur la page Retraits.
     */
    private function getNextPayout(): string
    {
        $hostId = $this->host->hostScopeId();

        $balance = (float) Commission::where('host_id', $hostId)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->sum('host_amount');

        return json_encode([
            'available_balance_fcfa' => $balance,
            'note' => "Solde des commissions déjà libérées par la plateforme, pas encore versées — correspond à la page Retraits.",
        ]);
    }

    private function getMostProfitableRoom(): string
    {
        $hostId = $this->host->hostScopeId();

        $rows = DB::table('bookings')
            ->join('rooms', 'bookings.room_id', '=', 'rooms.id')
            ->join('accommodations', 'rooms.accommodation_id', '=', 'accommodations.id')
            ->where('accommodations.host_id', $hostId)
            ->where('bookings.status', 'confirmed')
            ->select(
                'rooms.id as room_id',
                // Même repli que l'accessor Room::name() (name -> type -> "Chambre"),
                // rejoué en SQL brut car cette requête passe par le query builder,
                // pas par le modèle Eloquent.
                DB::raw("COALESCE(rooms.name, rooms.type, 'Chambre') as room_name"),
                'accommodations.name as accommodation_name',
                DB::raw('SUM(bookings.total_price) as revenue'),
                DB::raw('COUNT(*) as bookings_count')
            )
            ->groupBy('rooms.id', 'rooms.name', 'rooms.type', 'accommodations.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        return json_encode([
            'rooms' => $rows->map(fn ($r) => [
                'room_name' => $r->room_name,
                'accommodation_name' => $r->accommodation_name,
                'revenue_fcfa' => (float) $r->revenue,
                'bookings_count' => (int) $r->bookings_count,
            ]),
        ]);
    }
}
