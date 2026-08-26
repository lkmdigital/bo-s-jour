<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Booking;
use Illuminate\Http\Request;

/**
 * Espace de suivi du Programme de fidélité côté établissement (doc client
 * §14 : "Il peut également disposer d'un espace permettant de suivre les
 * performances du programme."). Limité aux établissements de l'hôte ayant
 * rejoint le programme (loyalty_program_joined_at).
 */
class HostLoyaltyController extends Controller
{
    public function stats(Request $request)
    {
        $hostId = $request->user()->hostScopeId();

        $accommodations = Accommodation::where('host_id', $hostId)->get(['id', 'name', 'loyalty_program_joined_at']);
        $participatingIds = $accommodations->whereNotNull('loyalty_program_joined_at')->pluck('id');

        if ($participatingIds->isEmpty()) {
            return response()->json([
                'data' => [
                    'participating' => false,
                    'total_accommodations' => $accommodations->count(),
                    'accommodations' => $accommodations->map(fn (Accommodation $a) => [
                        'id' => $a->id,
                        'name' => $a->name,
                        'joined_at' => $a->loyalty_program_joined_at,
                    ]),
                ],
            ]);
        }

        $months = max(1, min(24, (int) $request->input('months', 6)));
        $since = now()->startOfMonth()->subMonths($months - 1);

        // "Réservations réalisées par les membres" (doc §14) : tout voyageur
        // identifié rejoint automatiquement le Programme Membre à la création
        // de son compte (doc §2) — un compte connu (user_id renseigné) est
        // donc, par définition, un membre.
        $bookings = Booking::whereIn('accommodation_id', $participatingIds)
            ->where('status', 'confirmed')
            ->whereNotNull('user_id')
            ->where('created_at', '>=', $since)
            ->with(['promotion:id,name,discount_type,discount_percent,discount_amount,members_only', 'loyaltyVoucher:id,discount_percent'])
            ->get();

        $revenueGenerated = (float) $bookings->sum('total_price');

        // Coût des avantages : bons de fidélité (toujours en %) et promotions
        // "réservées aux membres" de type pourcentage ou montant fixe — le
        // type "nuit offerte" n'est pas chiffrable ici (le prix de la nuitée
        // n'est pas conservé sur la réservation), son usage est compté sans
        // entrer dans le coût total.
        $advantageCost = 0.0;
        $advantageUsageCount = 0;
        $topAdvantages = [];

        foreach ($bookings as $booking) {
            $cost = null;
            $label = null;

            if ($booking->loyaltyVoucher) {
                $percent = (float) $booking->loyaltyVoucher->discount_percent;
                $cost = $percent < 100 ? (float) $booking->total_price * $percent / (100 - $percent) : (float) $booking->total_price;
                $label = "Bon de fidélité -{$percent}%";
            } elseif ($booking->promotion && $booking->promotion->members_only) {
                $promotion = $booking->promotion;
                $label = 'Avantage membres — ' . $promotion->name;
                if ($promotion->discount_type === 'fixed') {
                    $cost = (float) $promotion->discount_amount;
                } elseif ($promotion->discount_type !== 'free_night') {
                    $percent = (float) $promotion->discount_percent;
                    $cost = $percent < 100 ? (float) $booking->total_price * $percent / (100 - $percent) : (float) $booking->total_price;
                }
            }

            if ($label === null) {
                continue;
            }

            $advantageUsageCount++;
            if ($cost !== null) {
                $advantageCost += $cost;
            }
            if (!isset($topAdvantages[$label])) {
                $topAdvantages[$label] = ['label' => $label, 'count' => 0, 'total_cost' => 0.0];
            }
            $topAdvantages[$label]['count']++;
            $topAdvantages[$label]['total_cost'] += $cost ?? 0;
        }

        $netRevenue = $revenueGenerated - $advantageCost;

        return response()->json([
            'data' => [
                'participating' => true,
                'period_months' => $months,
                'members_bookings_count' => $bookings->count(),
                'revenue_generated' => $revenueGenerated,
                'advantage_cost' => $advantageCost,
                'net_revenue' => $netRevenue,
                // Part des réservations membres ayant utilisé un avantage fidélité.
                'conversion_rate' => $bookings->count() > 0
                    ? round($advantageUsageCount / $bookings->count() * 100, 1)
                    : 0,
                // Estimation simple (non contractuelle) : CA net généré pour chaque
                // FCFA d'avantage accordé — le doc ne définit aucune formule de ROI.
                'roi_estimated' => $advantageCost > 0 ? round($netRevenue / $advantageCost, 2) : null,
                'top_advantages' => collect($topAdvantages)->sortByDesc('count')->values(),
                'accommodations' => $accommodations->map(fn (Accommodation $a) => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'joined_at' => $a->loyalty_program_joined_at,
                ]),
            ],
        ]);
    }
}
