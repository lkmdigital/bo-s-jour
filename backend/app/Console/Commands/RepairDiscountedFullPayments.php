<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Http\Controllers\PaymentController;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\PaymentSettlement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Répare les réservations bloquées « en attente » alors que le voyageur a bien réglé le paiement intégral au tarif annoncé (réduction de
 * 5 %) : avant le correctif du 2026-11-16, ce montant n'était pas reconnu comme un solde (voir PaymentSettlement).
 *
 * Par défaut : aperçu, rien n'est modifié. Avec --apply : les réservations encore vivantes sont soldées et confirmées (confirmation,
 * commission, e-mails). Les réservations déjà annulées sont seulement listées : réactiver ou rembourser est une décision humaine.
 */
class RepairDiscountedFullPayments extends Command
{
    protected $signature = 'payments:repair-discounted-full {--apply : Appliquer la réparation (sans cette option : aperçu seulement)}';

    protected $description = 'Solde les réservations payées au tarif de paiement intégral (réduction comprise) restées « en attente »';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $payments = Payment::with('booking')
            ->where('purpose', 'full')
            ->where('status', 'completed')
            ->whereHas('booking', fn ($q) => $q->where('payment_status', '!=', 'paid')->whereNotIn('status', [BookingStatus::Completed->value]))
            ->orderBy('id')
            ->get()
            ->unique('booking_id');

        $rows = [];
        $repairable = [];
        foreach ($payments as $payment) {
            $booking = $payment->booking;
            $paid = (float) Payment::where('booking_id', $booking->id)->where('status', 'completed')->sum('amount');
            $probe = clone $booking;
            $probe->amount_paid = min((float) $booking->total_price, $paid);
            if (!PaymentSettlement::fullPaymentCovers($probe)) {
                continue;   // vraiment partiel : pas concerné
            }

            $cancelled = $booking->status === BookingStatus::Cancelled;
            $rows[] = [
                $booking->id, $booking->booking_number ?: '—', $booking->status->value, number_format($paid, 0, ',', ' '),
                number_format((float) $booking->total_price, 0, ',', ' '), $cancelled ? 'à traiter à la main' : ($apply ? 'réparée' : 'réparable'),
            ];
            if (!$cancelled) {
                $repairable[] = $payment;
            }
        }

        if ($rows === []) {
            $this->info('Aucune réservation concernée.');
            return self::SUCCESS;
        }

        $this->table(['Réservation', 'N°', 'Statut', 'Encaissé (FCFA)', 'Total (FCFA)', 'Action'], $rows);

        if (!$apply) {
            $this->warn(count($repairable) . ' réparable(s). Relancez avec --apply pour les solder (les annulées restent à traiter à la main).');
            return self::SUCCESS;
        }

        $controller = app(PaymentController::class);
        foreach ($repairable as $payment) {
            DB::transaction(function () use ($controller, $payment) {
                $booking = Booking::lockForUpdate()->find($payment->booking_id);
                // Le paiement est ajouté à nouveau par la mise à jour d'état : on repart donc des autres paiements encaissés.
                $booking->amount_paid = (float) Payment::where('booking_id', $booking->id)->where('status', 'completed')->where('id', '!=', $payment->id)->sum('amount');
                $booking->save();
                $controller->finalizeAfterPayment($payment->fresh());
            });
        }
        $this->info(count($repairable) . ' réservation(s) soldée(s).');

        return self::SUCCESS;
    }
}
