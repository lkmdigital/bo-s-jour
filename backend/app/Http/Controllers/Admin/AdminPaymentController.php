<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PaymentController;
use App\Models\ClientCredit;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPaymentController extends Controller
{
    /**
     * Seuil par défaut (heures) au-delà duquel un paiement "pending" est considéré
     * bloqué — voir stuckPending()/confirmManually(), le filet de sécurité pour le
     * webhook Malia Pay qui peut ne jamais arriver (voir commande payments:flag-stuck-pending).
     */
    private const DEFAULT_STUCK_HOURS = 6;

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
            'summary' => $this->summary($request),
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

    private function filteredPaymentsQuery(Request $request, bool $forSummary = false): Builder
    {
        // Le menu Paiements ne montre que les transactions finalisées (succès ou
        // échec) — les paiements "pending" sont de simples tentatives de checkout,
        // pas encore des transactions à comptabiliser ici.
        $query = Payment::with([
            'user:id,name,email',
            'booking:id,accommodation_id,check_in,check_out',
            'booking.accommodation:id,name,host_id',
            'booking.accommodation.host:id,name',
        ])->orderByDesc('created_at');

        if (!$forSummary) {
            $query->whereIn('status', ['completed', 'failed']);
        }

        // Le résumé ventile lui-même par statut : le filtre de statut ne s'y applique pas.
        if (!$forSummary && $request->filled('status')) {
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
    /**
     * Retour client 2026-09-18 : les totaux suivent les filtres de la page
     * (période, type, moyen de paiement, recherche) — plus seulement la liste.
     */
    private function summary(Request $request): array
    {
        $base = fn () => $this->filteredPaymentsQuery($request, true)->reorder();

        $byMethod = $base()->where('status', 'completed')
            ->select('payment_method', DB::raw('SUM(amount) as total'))
            ->groupBy('payment_method')
            ->pluck('total', 'payment_method');

        return [
            'total_completed' => (float) $base()->where('status', 'completed')->sum('amount'),
            'total_failed' => (float) $base()->where('status', 'failed')->sum('amount'),
            'total_refunded' => (float) $base()->where('status', 'refunded')->sum('amount'),
            'count_completed' => $base()->where('status', 'completed')->count(),
            'count_failed' => $base()->where('status', 'failed')->count(),
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

    /**
     * Filet de sécurité webhook Malia Pay : liste des paiements "pending" restés
     * bloqués au-delà du seuil (probable webhook jamais reçu — voir découverte du
     * 2026-09-01, 30 paiements sur 31 restés "pending" faute de webhook depuis mai).
     * À croiser manuellement avec le dashboard marchand Malia Pay avant de confirmer
     * quoi que ce soit — voir confirmManually().
     */
    public function stuckPending(Request $request)
    {
        $hours = max(0, (int) $request->get('hours', self::DEFAULT_STUCK_HOURS));

        $payments = Payment::with([
                'user:id,name,email',
                'booking:id,accommodation_id,check_in,check_out',
                'booking.accommodation:id,name',
            ])
            ->where('status', 'pending')
            ->where('created_at', '<', now()->subHours($hours))
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'threshold_hours' => $hours,
            'count' => $payments->count(),
            'data' => $payments,
        ]);
    }

    /**
     * Confirme manuellement un paiement resté "pending" — réservé aux cas où l'admin
     * a vérifié dans le dashboard marchand Malia Pay que l'argent a réellement été
     * encaissé, mais que le webhook automatique n'est jamais arrivé (voir stuckPending()).
     *
     * Réutilise exactement la même logique que le webhook (PaymentController::confirmPaymentSuccess) :
     * mêmes effets de bord (commission, notifications, e-mails), même garde d'idempotence.
     * L'admin qui confirme et son motif sont journalisés pour la traçabilité — cette action
     * modifie un état financier sans preuve cryptographique, contrairement au webhook.
     */
    public function confirmManually(Request $request, $paymentId)
    {
        $validated = $request->validate([
            'transaction_id' => 'required|string|max:255',
            'note' => 'nullable|string|max:1000',
        ]);

        $payment = Payment::findOrFail($paymentId);

        if ($payment->status !== 'pending') {
            return response()->json([
                'message' => "Ce paiement n'est pas en attente (statut actuel : {$payment->status}), rien à confirmer.",
            ], 400);
        }

        Log::warning('Confirmation manuelle de paiement par un admin (filet de sécurité webhook Malia Pay)', [
            'payment_id' => $payment->id,
            'reference' => $payment->payment_reference,
            'admin_id' => $request->user()->id,
            'admin_email' => $request->user()->email,
            'transaction_id' => $validated['transaction_id'],
            'note' => $validated['note'] ?? null,
        ]);

        $result = app(PaymentController::class)->confirmPaymentSuccess(
            $payment->id,
            $validated['transaction_id'],
            null, // montant : on garde celui déjà enregistré, l'admin ne le ressaisit pas
            [
                'source' => 'admin_manual_confirmation',
                'admin_id' => $request->user()->id,
                'admin_email' => $request->user()->email,
                'note' => $validated['note'] ?? null,
                'confirmed_at' => now()->toIso8601String(),
            ],
            'admin_manual'
        );

        return response()->json([
            'message' => $result['already_completed']
                ? 'Ce paiement avait déjà été confirmé entre-temps (probablement par le webhook).'
                : 'Paiement confirmé manuellement.',
            'payment' => $result['payment'],
        ]);
    }

    /**
     * Vérifie auprès de MaliaPay le statut réel d'un paiement « pending » et le confirme
     * (ou le marque échoué) selon la réponse — sans que l'admin ait à ressaisir quoi que ce soit.
     */
    public function reconcile(Request $request, $paymentId)
    {
        $payment = Payment::findOrFail($paymentId);

        if ($payment->status !== 'pending') {
            return response()->json(['message' => "Ce paiement n'est pas en attente (statut : {$payment->status})."], 400);
        }

        if (!$payment->transaction_id) {
            return response()->json(['message' => "Ce paiement n'a pas d'identifiant de transaction : vérifiez-le dans le tableau de bord Malia Pay."], 422);
        }

        $controller = app(PaymentController::class);
        $malia = $controller->checkTransactionStatus($payment->transaction_id);

        if ($malia === null) {
            return response()->json(['message' => 'Malia Pay est injoignable, réessayez dans un instant.'], 502);
        }

        $status = $malia['status'] ?? null;

        if ($status === 'success') {
            $controller->confirmPaymentSuccess(
                $payment->id,
                $malia['transaction_id'] ?? $payment->transaction_id,
                isset($malia['montant']) ? (int) round((float) $malia['montant']) : null,
                $malia,
                'reconciliation_admin'
            );
            return response()->json(['message' => 'Paiement confirmé : Malia Pay indique un succès.', 'status' => 'completed']);
        }

        if ($status === 'failed' || $status === 'cancelled') {
            $payment->update(['status' => 'failed']);
            $payment->booking?->update(['payment_status' => 'failed']);
            return response()->json(['message' => 'Malia Pay indique que ce paiement a échoué.', 'status' => 'failed']);
        }

        return response()->json(['message' => "Malia Pay indique un statut « {$status} » : le paiement n'est pas (encore) réussi.", 'status' => $status]);
    }
}
