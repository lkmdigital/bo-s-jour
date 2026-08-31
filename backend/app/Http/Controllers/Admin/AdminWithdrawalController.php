<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\User;
use App\Models\WithdrawalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminWithdrawalController extends Controller
{
    public function index(Request $request)
    {
        $items = $this->filteredQuery($request)->paginate($request->get('per_page', 20));
        return response()->json($items);
    }

    /**
     * Export CSV des demandes / reversements filtrés.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $withdrawals = $this->filteredQuery($request)->get();
        $filename = 'reversements-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($withdrawals) {
            $out = fopen('php://output', 'w');
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($out, ['Date', 'Hôte', 'Email', 'Montant (FCFA)', 'Méthode', 'Référence', 'Statut', 'Traité le', 'Note admin']);
            foreach ($withdrawals as $w) {
                fputcsv($out, [
                    optional($w->created_at)->format('Y-m-d H:i'),
                    $w->host->name ?? '',
                    $w->host->email ?? '',
                    $w->amount,
                    $w->payment_method,
                    $w->payment_reference,
                    $w->status,
                    optional($w->processed_at)->format('Y-m-d H:i'),
                    $w->admin_note,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filteredQuery(Request $request)
    {
        $query = WithdrawalRequest::with(['host:id,name,email', 'processedBy:id,name'])
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return $query;
    }

    /**
     * Créer un reversement à l'initiative de l'admin (sans attendre une
     * demande de l'hôte). Immédiatement marqué "approuvé".
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'host_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'admin_note' => 'nullable|string|max:500',
        ]);

        $host = User::findOrFail($validated['host_id']);
        if (!$host->isHost()) {
            return response()->json(['message' => "Cet utilisateur n'est pas un hôte."], 422);
        }

        $withdrawal = DB::transaction(function () use ($host, $validated, $request) {
            $withdrawal = WithdrawalRequest::create([
                'host_id' => $host->id,
                'amount' => $validated['amount'],
                'status' => 'approved',
                'payment_method' => $validated['payment_method'],
                'payment_reference' => $validated['payment_reference'] ?? null,
                'admin_note' => $validated['admin_note'] ?? null,
                'processed_at' => now(),
                'processed_by' => $request->user()->id,
            ]);

            // Reversement à l'initiative de l'admin : override volontaire, pas conditionné à
            // la couverture par des commissions "pending" (contrairement à approve() ci-dessous).
            $this->markCommissionsPaid($withdrawal);

            return $withdrawal;
        });

        return response()->json($withdrawal->load('host'), 201);
    }

    public function approve(Request $request, int $id)
    {
        $request->validate(['admin_note' => 'nullable|string|max:500']);

        $result = DB::transaction(function () use ($request, $id) {
            // Verrou sur la demande elle-même : empêche une double approbation si deux
            // requêtes admin arrivent en parallèle sur la même demande "pending".
            $withdrawal = WithdrawalRequest::with('host')->lockForUpdate()->findOrFail($id);
            if ($withdrawal->status !== 'pending') {
                return ['error' => 'Cette demande a déjà été traitée.'];
            }

            // Ne marque "approuvé" que si les commissions "pending" du host couvrent
            // réellement le montant — avant ce correctif, une deuxième demande de retrait
            // pouvait être approuvée alors que la première avait déjà consommé tout le solde
            // de commissions disponible, sans qu'aucune vérification ne le signale (double
            // reversement possible côté virement bancaire manuel).
            if (!$this->markCommissionsPaid($withdrawal)) {
                return ['error' => "Solde de commissions disponible insuffisant pour couvrir ce montant (probablement déjà consommé par une autre demande approuvée) — vérifiez avant d'approuver."];
            }

            $withdrawal->update([
                'status' => 'approved',
                'admin_note' => $request->admin_note,
                'processed_at' => now(),
                'processed_by' => $request->user()->id,
            ]);

            return ['withdrawal' => $withdrawal];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json($result['withdrawal']->load('host'));
    }

    public function reject(Request $request, int $id)
    {
        $request->validate(['admin_note' => 'nullable|string|max:500']);

        $withdrawal = WithdrawalRequest::findOrFail($id);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée.'], 422);
        }

        $withdrawal->update([
            'status' => 'rejected',
            'admin_note' => $request->admin_note,
            'processed_at' => now(),
            'processed_by' => $request->user()->id,
        ]);

        return response()->json($withdrawal->load('host'));
    }

    /**
     * Marque les commissions dues (FIFO par released_at) comme payées jusqu'à couvrir le
     * montant du reversement. Verrouillées (lockForUpdate) pour empêcher qu'une même
     * commission soit consommée deux fois par deux approbations concurrentes.
     *
     * @return bool false si les commissions "pending" disponibles ne couvrent pas le
     *              montant demandé — rien n'est marqué payé dans ce cas, à l'appelant de
     *              décider (approve() refuse l'approbation ; store() l'ignore sciemment).
     */
    private function markCommissionsPaid(WithdrawalRequest $withdrawal): bool
    {
        $remaining = (float) $withdrawal->amount;
        $commissions = Commission::where('host_id', $withdrawal->host_id)
            ->whereNotNull('released_at')
            ->where('status', 'pending')
            ->orderBy('released_at')
            ->lockForUpdate()
            ->get();

        if ((float) $commissions->sum('host_amount') + 0.01 < $remaining) {
            return false;
        }

        foreach ($commissions as $c) {
            if ($remaining <= 0) {
                break;
            }
            $c->update(['status' => 'paid', 'paid_at' => now()]);
            $remaining -= (float) $c->host_amount;
        }

        return true;
    }
}
