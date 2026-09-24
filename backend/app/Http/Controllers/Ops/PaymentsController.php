<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PaymentController;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Module Paiements du dashboard Ops (Blade) : point unique pour traiter les
 * paiements "pending" (webhook Malia Pay jamais reçu) et "failed" — reprend
 * la logique déjà posée dans Admin\AdminPaymentController::reconcile(), en
 * vue serveur plutôt qu'API/JSON.
 */
class PaymentsController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->get('status', 'pending');
        $status = in_array($status, ['pending', 'failed'], true) ? $status : 'pending';

        $payments = Payment::with([
                'user:id,name,email',
                'booking:id,accommodation_id,check_in,check_out',
                'booking.accommodation:id,name',
            ])
            ->where('status', $status)
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        $counts = [
            'pending' => Payment::where('status', 'pending')->count(),
            'failed' => Payment::where('status', 'failed')->count(),
        ];

        return view('ops.payments.index', compact('payments', 'status', 'counts'));
    }

    public function reconcile(Request $request, Payment $payment)
    {
        if (!in_array($payment->status, ['pending', 'failed'], true)) {
            return back()->with('ops_error', "Ce paiement est déjà confirmé (statut : {$payment->status}).");
        }

        if (!$payment->transaction_id) {
            return back()->with('ops_error', "Ce paiement n'a pas d'identifiant de transaction : vérifiez-le dans le tableau de bord Malia Pay.");
        }

        $controller = app(PaymentController::class);
        $malia = $controller->checkTransactionStatus($payment->transaction_id);

        if ($malia === null) {
            return back()->with('ops_error', 'Malia Pay est injoignable, réessayez dans un instant.');
        }

        $metaStatus = strtolower((string) ($malia['status'] ?? ''));

        if ($metaStatus === 'success') {
            $controller->confirmPaymentSuccess(
                $payment->id,
                $malia['transaction_id'] ?? $payment->transaction_id,
                isset($malia['montant']) ? (int) round((float) $malia['montant']) : null,
                $malia,
                'reconciliation_ops'
            );
            Log::info('Ops : paiement confirmé via réconciliation manuelle', ['payment_id' => $payment->id, 'admin_id' => $request->user('web')?->id]);
            return back()->with('ops_success', 'Paiement confirmé : Malia Pay indique un succès.');
        }

        if ($metaStatus === 'failed' || $metaStatus === 'cancelled') {
            if ($payment->status !== 'failed') {
                $payment->update(['status' => 'failed']);
                $payment->booking?->update(['payment_status' => 'failed']);
            }
            return back()->with('ops_error', 'Malia Pay indique que ce paiement a échoué.');
        }

        return back()->with('ops_error', "Malia Pay indique un statut « {$metaStatus} » : le paiement n'est pas (encore) réussi.");
    }
}
