<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\CorporateAnnualReward;
use App\Models\CorporateCollaborator;
use App\Models\CorporateRewardTier;
use App\Models\User;
use App\Notifications\CorporateAnnualRewardNotification;
use Illuminate\Support\Facades\DB;

/**
 * Logique du Programme Corporate BoSéjour (doc client §9-13) : chiffre
 * d'affaires annuel d'une entreprise et récompense de palier associée.
 * Distinct de LoyaltyService (Programme Membre), qui porte sur les points
 * individuels du voyageur.
 */
class CorporateLoyaltyService
{
    /**
     * CA "réalisé" d'une entreprise sur une année civile : réservations
     * professionnelles (traveler_type=corporate) du responsable et de ses
     * collaborateurs actifs, séjour terminé (même critère de séjour "réalisé"
     * que AwardLoyaltyPoints — statut confirmed, pas de no-show), regroupées
     * par date de check-out. Même périmètre de réservations que
     * CorporateController::expenses().
     */
    public function computeAnnualRevenue(User $owner, int $year): float
    {
        $collaboratorIds = CorporateCollaborator::where('owner_id', $owner->id)
            ->where('status', CorporateCollaborator::STATUS_ACTIVE)
            ->whereNotNull('collaborator_user_id')
            ->pluck('collaborator_user_id');

        $userIds = $collaboratorIds->push($owner->id)->unique();

        return (float) Booking::where('traveler_type', 'corporate')
            ->where('status', 'confirmed')
            ->whereNull('no_show_at')
            ->whereYear('check_out', $year)
            ->where(function ($q) use ($userIds, $owner) {
                $q->whereIn('user_id', $userIds)->orWhere('corporate_owner_id', $owner->id);
            })
            ->sum('total_price');
    }

    /**
     * Palier le plus élevé atteint par ce CA (paliers cumulatifs : atteindre
     * 25 M FCFA donne la récompense du palier 25 M, pas un cumul des paliers
     * inférieurs — cf. doc §12, un seul "Récompense proposée" par ligne de CA).
     */
    public function determineRewardTier(float $revenue): ?CorporateRewardTier
    {
        return CorporateRewardTier::active()
            ->where('revenue_threshold', '<=', $revenue)
            ->orderByDesc('revenue_threshold')
            ->first();
    }

    /**
     * Calcule et fige la récompense Corporate de l'entreprise pour une année
     * donnée. Idempotent (unique owner_id+year) : un second appel pour la
     * même année met à jour le cliché plutôt que d'en créer un autre — utile
     * si la commande est relancée après une correction de données, mais une
     * année déjà figée n'est jamais recalculée automatiquement par la
     * commande planifiée (voir ComputeCorporateAnnualRewards --force).
     */
    public function freezeYearReward(User $owner, int $year): CorporateAnnualReward
    {
        $revenue = $this->computeAnnualRevenue($owner, $year);
        $tier = $this->determineRewardTier($revenue);

        $reward = DB::transaction(function () use ($owner, $year, $revenue, $tier) {
            return CorporateAnnualReward::updateOrCreate(
                ['owner_id' => $owner->id, 'year' => $year],
                [
                    'revenue_total' => $revenue,
                    'reward_tier_id' => $tier?->id,
                    'reward_label' => $tier?->reward_label,
                    'computed_at' => now(),
                ]
            );
        });

        $this->notify($owner, $reward);

        return $reward;
    }

    protected function notify(User $owner, CorporateAnnualReward $reward): void
    {
        try {
            $owner->notify(new CorporateAnnualRewardNotification($reward));
        } catch (\Throwable $e) {
            \Log::warning('Échec notification bilan Corporate annuel', [
                'owner_id' => $owner->id,
                'year' => $reward->year,
                'error' => $e->getMessage(),
            ]);
        }

        if ($owner->notif_whatsapp && ($owner->whatsapp || $owner->phone)) {
            try {
                $message = $reward->reward_label
                    ? "Votre bilan Corporate {$reward->year} est prêt : {$reward->reward_label}."
                    : "Votre bilan Corporate {$reward->year} est prêt.";
                app(WhatsAppService::class)->sendText($owner->whatsapp ?: $owner->phone, "bo séjour — {$message}");
            } catch (\Throwable $e) {
                \Log::warning('Échec notification WhatsApp bilan Corporate', [
                    'owner_id' => $owner->id,
                    'year' => $reward->year,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
