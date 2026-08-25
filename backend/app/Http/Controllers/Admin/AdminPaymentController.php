<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientCredit;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPaymentController extends Controller
{
    /**
     * Historique des transactions (paiements voyageurs) avec filtres.
     */
    public function index(Request $request)
    {
        $items = $this->filteredPaymentsQuery($request)->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $items->items(),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'summary' => $this->summary(),
        ]);
    }

    /**
     * Export CSV des transactions filtrées (compatible Excel).
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $payments = $this->filteredPaymentsQuery($request)->get();
        $filename = 'transactions-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($payments) {
            $out = fopen('php://output', 'w');
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8 pour Excel
            fputcsv($out, ['Date', 'Voyageur', 'Email', 'Établissement', 'Type', 'Méthode', 'Montant (FCFA)', 'Statut', 'Référence']);
            foreach ($payments as $p) {
                fputcsv($out, [
                    optional($p->created_at)->format('Y-m-d H:i'),
                    $p->user->name ?? '',
                    $p->user->email ?? '',
                    $p->booking->accommodation->name ?? '',
                    $p->purpose,
                    $p->payment_method,
                    $p->amount,
                    $p->status,
                    $p->payment_reference,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filteredPaymentsQuery(Request $request): Builder
    {
        // Le menu Paiements ne montre que les transactions finalisées (succès ou
        // échec) — les paiements "pending" sont de simples tentatives de checkout,
        // pas encore des transactions à comptabiliser ici.
        $query = Payment::with([
            'user:id,name,email',
            'booking:id,accommodation_id,check_in,check_out',
            'booking.accommodation:id,name,host_id',
            'booking.accommodation.host:id,name',
        ])->whereIn('status', ['completed', 'failed'])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('purpose')) {
            $query->where('purpose', $request->purpose);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_id', 'like', "%{$search}%")
                  ->orWhere('payment_reference', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        return $query;
    }

    /**
     * Totaux globaux (toutes périodes, statuts finalisés uniquement) pour les
     * cartes de résumé, dont la répartition par moyen de paiement (montant
     * réellement encaissé, statut "completed" uniquement). MTN Money / Moov
     * Money ne sont pas encore actifs au checkout (cf. PaymentController) —
     * leurs totaux seront à 0 tant qu'aucun paiement réel n'y transite.
     */
    private function summary(): array
    {
        $byMethod = Payment::where('status', 'completed')
            ->select('payment_method', DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method')
            ->pluck('total', 'payment_method');

        return [
            'total_completed' => (float) Payment::where('status', 'completed')->sum('amount'),
            'total_failed' => (float) Payment::where('status', 'failed')->sum('amount'),
            'total_refunded' => (float) Payment::where('status', 'refunded')->sum('amount'),
            'count_completed' => Payment::where('status', 'completed')->count(),
            'count_failed' => Payment::where('status', 'failed')->count(),
            'by_method' => [
                'wave-ci' => (float) ($byMethod['wave-ci'] ?? 0),
                'orange-ci' => (float) ($byMethod['orange-ci'] ?? 0),
                'mtn-ci' => (float) ($byMethod['mtn-ci'] ?? 0),
                'moov-ci' => (float) ($byMethod['moov-ci'] ?? 0),
                'visa-mastercard' => (float) ($byMethod['visa-mastercard'] ?? 0),
                'djamo' => (float) ($byMethod['djamo'] ?? 0),
            ],
        ];
    }

    /**
     * Liste des avoirs clients (client_credits), tous utilisateurs confondus.
     */
    public function credits(Request $request)
    {
        $items = $this->filteredCreditsQuery($request)->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $items->items(),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
            'summary' => [
                'total_available' => (float) ClientCredit::available()->sum('amount'),
                'total_used' => (float) ClientCredit::where('status', ClientCredit::STATUS_USED)->sum('amount'),
                'count_available' => ClientCredit::available()->count(),
            ],
        ]);
    }

    /**
     * Export CSV des avoirs filtrés.
     */
    public function exportCreditsCsv(Request $request): StreamedResponse
    {
        $credits = $this->filteredCreditsQuery($request)->get();
        $filename = 'avoirs-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($credits) {
            $out = fopen('php://output', 'w');
            fwrite($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($out, ['Date', 'Client', 'Email', 'Montant (FCFA)', 'Source', 'Statut', 'Expire le', 'Note']);
            foreach ($credits as $c) {
                fputcsv($out, [
                    optional($c->created_at)->format('Y-m-d H:i'),
                    $c->user->name ?? '',
                    $c->user->email ?? '',
                    $c->amount,
                    $c->source_type,
                    $c->status,
                    optional($c->expires_at)->format('Y-m-d'),
                    $c->note,
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filteredCreditsQuery(Request $request): Builder
    {
        $query = ClientCredit::with([
            'user:id,name,email',
            'sourceBooking:id,accommodation_id',
            'sourceBooking.accommodation:id,name',
        ])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($uq) use ($search) {
                $uq->where('name', 'like', "%{$search}%")
                   ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query;
    }
}
