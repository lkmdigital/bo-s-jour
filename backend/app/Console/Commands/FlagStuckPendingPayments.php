<?php

namespace App\Console\Commands;

use App\Http\Controllers\PaymentController;
use App\Mail\StuckPaymentsDigest;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Filet de sécurité pour le webhook MaliaPay, qui n'a aucune garantie de livraison
 * (découverte du 2026-09-01 : 30 paiements sur 31 restés "pending" depuis mai avec
 * l'ancienne intégration malia-pay.com, faute de webhook jamais reçu — silencieux
 * pendant plus de 3 mois faute de visibilité).
 *
 * Depuis la migration vers la nouvelle API MaliaPay (business.malia.ci, 2026-09-01),
 * chaque paiement a un `transaction_id` connu dès sa création (voir
 * PaymentController::createPaymentLink()) — on peut donc interroger le VRAI statut
 * via GET /v1/payments/{transaction_id} (PaymentController::checkTransactionStatus())
 * et confirmer/échouer automatiquement, au lieu de se contenter d'alerter un humain.
 *
 * Les paiements SANS transaction_id (créés avant la migration, ancienne API) ne
 * peuvent pas être vérifiés ainsi — ils restent listés dans le digest e-mail pour
 * une confirmation manuelle après vérification dans le dashboard marchand MaliaPay
 * (voir Admin\AdminPaymentController::confirmManually()).
 */
class FlagStuckPendingPayments extends Command
{
    protected $signature = 'payments:flag-stuck-pending {--hours=6 : Ancienneté minimale (heures) pour considérer un paiement "pending" comme bloqué}';

    protected $description = "Réconcilie automatiquement les paiements \"pending\" bloqués via l'API MaliaPay (statut réel), et alerte les admins par e-mail pour ceux qui restent à vérifier manuellement.";

    public function handle(PaymentController $paymentController): int
    {
        $hours = max(1, (int) $this->option('hours'));

        $stuckPayments = Payment::with(['booking:id,accommodation_id', 'booking.accommodation:id,name'])
            ->where('status', 'pending')
            ->where('created_at', '<', now()->subHours($hours))
            ->orderBy('created_at')
            ->get();

        if ($stuckPayments->isEmpty()) {
            $this->info('Aucun paiement bloqué à signaler.');
            return self::SUCCESS;
        }

        $resolvedSuccess = 0;
        $resolvedFailed = 0;
        $stillStuck = collect();

        foreach ($stuckPayments as $payment) {
            if (!$payment->transaction_id) {
                // Ancienne intégration (avant le 2026-09-01), aucun transaction_id
                // exploitable pour interroger MaliaPay — vérification manuelle requise.
                $stillStuck->push($payment);
                continue;
            }

            $maliaStatus = $paymentController->checkTransactionStatus($payment->transaction_id);

            if ($maliaStatus === null) {
                // API indisponible ou erreur réseau — ne rien conclure, on retentera
                // au prochain passage plutôt que de risquer une fausse conclusion.
                $stillStuck->push($payment);
                continue;
            }

            $realStatus = $maliaStatus['status'] ?? null;

            if ($realStatus === 'success') {
                $paymentController->confirmPaymentSuccess(
                    $payment->id,
                    $maliaStatus['transaction_id'] ?? $payment->transaction_id,
                    isset($maliaStatus['montant']) ? (int) round((float) $maliaStatus['montant']) : null,
                    $maliaStatus,
                    'reconciliation_auto'
                );
                $resolvedSuccess++;
                continue;
            }

            if ($realStatus === 'failed' || $realStatus === 'cancelled') {
                $payment->update([
                    'status' => 'failed',
                    'payment_data' => array_merge($payment->payment_data ?? [], [
                        'reconciliation_data' => $maliaStatus,
                        'failed_at' => now()->toIso8601String(),
                    ]),
                ]);
                $payment->booking?->update(['payment_status' => 'failed']);

                Log::info('payments:flag-stuck-pending : paiement marqué échoué après vérification MaliaPay', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->payment_reference,
                    'malia_status' => $realStatus,
                ]);
                $resolvedFailed++;
                continue;
            }

            // "pending"/"processing" côté MaliaPay aussi : probablement un abandon de
            // paiement normal, mais pas de certitude — reste listé pour suivi humain.
            $stillStuck->push($payment);
        }

        if ($resolvedSuccess > 0 || $resolvedFailed > 0) {
            $this->info("{$resolvedSuccess} paiement(s) confirmé(s) et {$resolvedFailed} marqué(s) échoué(s) automatiquement après vérification MaliaPay.");
            Log::info('payments:flag-stuck-pending : réconciliation automatique', [
                'resolved_success' => $resolvedSuccess,
                'resolved_failed' => $resolvedFailed,
                'still_stuck' => $stillStuck->count(),
            ]);
        }

        if ($stillStuck->isEmpty()) {
            $this->info('Plus aucun paiement à vérifier manuellement après réconciliation automatique.');
            return self::SUCCESS;
        }

        return $this->sendDigest($stillStuck, $hours);
    }

    private function sendDigest($payments, int $hours): int
    {
        $adminEmails = User::where('role', 'admin')->whereNotNull('email')->pluck('email');

        if ($adminEmails->isEmpty()) {
            Log::warning('payments:flag-stuck-pending : aucun admin avec e-mail trouvé, alerte non envoyée', [
                'stuck_count' => $payments->count(),
            ]);
            $this->warn("{$payments->count()} paiement(s) toujours à vérifier, mais aucun admin à notifier.");
            return self::SUCCESS;
        }

        $frontend = rtrim(config('services.frontend_url', 'https://bosejour.ci'), '/');
        $dashboardUrl = $frontend . '/dashboard/admin/paiements';

        try {
            Mail::to($adminEmails->first())
                ->cc($adminEmails->slice(1)->all())
                ->send(new StuckPaymentsDigest($payments, $hours, $dashboardUrl));

            Log::info('payments:flag-stuck-pending : digest envoyé', [
                'stuck_count' => $payments->count(),
                'threshold_hours' => $hours,
                'recipients' => $adminEmails->count(),
            ]);

            $this->info("{$payments->count()} paiement(s) à vérifier manuellement, signalé(s) à {$adminEmails->count()} admin(s).");
        } catch (\Throwable $e) {
            Log::error('payments:flag-stuck-pending : échec envoi digest', [
                'error' => $e->getMessage(),
                'stuck_count' => $payments->count(),
            ]);
            $this->error("Échec de l'envoi du digest : {$e->getMessage()}");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
