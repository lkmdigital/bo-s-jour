<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\WithdrawalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HostWithdrawalController extends Controller
{
    /**
     * Les coordonnées bancaires et les retraits restent réservés au propriétaire, même pour
     * un collaborateur "Administrateur" (brief Extranet Partenaire, Phase 13) — étendu ici
     * à la consultation (solde, historique), pas seulement à la création d'une demande.
     */
    private function assertOwnerOnly(Request $request): ?\Illuminate\Http\JsonResponse
    {
        if ($request->user()->isStaff()) {
            return response()->json([
                'message' => "Les reversements sont réservés au propriétaire du compte.",
            ], 403);
        }
        return null;
    }

    /**
     * Solde réellement disponible pour un NOUVEAU retrait : commissions released non
     * versées, moins ce qu'un retrait déjà en attente réserve déjà. Sans cette soustraction,
     * l'hôte pouvait soumettre plusieurs demandes consécutives pour la totalité de son solde
     * avant qu'aucune ne soit traitée (double reversement possible si l'admin en approuve
     * plus d'une — voir AdminWithdrawalController::approve()).
     */
    private function availableForNewWithdrawal(int $hostId): float
    {
        $commissions = (float) Commission::where('host_id', $hostId)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->sum('host_amount');

        $alreadyPending = (float) WithdrawalRequest::where('host_id', $hostId)
            ->where('status', 'pending')
            ->sum('amount');

        return max(0, $commissions - $alreadyPending);
    }

    /**
     * Solde disponible pour retrait (commissions released, non encore versées).
     */
    public function availableBalance(Request $request)
    {
        if ($response = $this->assertOwnerOnly($request)) {
            return $response;
        }
        $balance = $this->availableForNewWithdrawal($request->user()->hostScopeId());
        return response()->json(['available_balance' => $balance]);
    }

    /**
     * Liste des demandes de retrait de l'hôte.
     */
    public function index(Request $request)
    {
        if ($response = $this->assertOwnerOnly($request)) {
            return $response;
        }
        $requests = WithdrawalRequest::where('host_id', $request->user()->hostScopeId())
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));
        return response()->json($requests);
    }

    /**
     * Créer une demande de retrait.
     */
    public function store(Request $request)
    {
        // Les coordonnées bancaires et les retraits restent réservés au propriétaire,
        // même pour un collaborateur "Administrateur" (brief Extranet Partenaire,
        // Phase 13 : "accès total... hors coordonnées bancaires").
        if ($request->user()->isStaff()) {
            return response()->json([
                'message' => "Les demandes de retrait sont réservées au propriétaire du compte.",
            ], 403);
        }

        $request->validate([
            'amount' => 'required|numeric|min:1000',
            'payment_method' => 'nullable|string|max:50',
            'host_note' => 'nullable|string|max:500',
        ]);

        if (!$request->user()->hasBankDetails()) {
            return response()->json([
                'message' => 'Renseignez vos coordonnées bancaires (RIB) dans votre profil avant de demander un retrait.',
                'bank_details_required' => true,
            ], 422);
        }

        $hostId = $request->user()->id;
        $amount = (float) $request->amount;

        $withdrawal = DB::transaction(function () use ($hostId, $amount, $request) {
            // Verrouille les commissions du host le temps du calcul + de la création, pour
            // qu'une deuxième demande soumise en parallèle voie bien celle-ci une fois créée.
            Commission::where('host_id', $hostId)
                ->whereNotNull('released_at')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->get();
            WithdrawalRequest::where('host_id', $hostId)->where('status', 'pending')->lockForUpdate()->get();

            $available = $this->availableForNewWithdrawal($hostId);

            if ($amount > $available) {
                return null;
            }

            return WithdrawalRequest::create([
                'host_id' => $hostId,
                'amount' => $amount,
                'status' => 'pending',
                'payment_method' => $request->payment_method,
                'host_note' => $request->host_note,
            ]);
        });

        if ($withdrawal === null) {
            $available = $this->availableForNewWithdrawal($hostId);
            return response()->json([
                'message' => 'Le montant demandé dépasse votre solde disponible (' . number_format($available, 0, ',', ' ') . ' FCFA).',
            ], 422);
        }

        return response()->json($withdrawal, 201);
    }
}
