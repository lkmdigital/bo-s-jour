<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Http\Controllers\PaymentController;
use App\Models\Booking;
use App\Models\ClientCredit;
use App\Models\Payment;
use App\Services\BookingService;
use App\Services\PaymentSettlement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Régularise des réservations annulées automatiquement alors que le voyageur avait payé (paiement intégral au tarif annoncé, non reconnu
 * avant le correctif du 2026-11-16) : elles repassent « confirmées » et « payées », avec leur numéro, leur commission et leurs dates bloquées.
 *
 * Garde-fous : l'avoir créé à l'annulation est annulé (sinon le client aurait la réservation ET l'avoir) ; une réservation remboursée, dont
 * l'avoir a déjà été utilisé, ou dont les dates ne sont plus libres est refusée. Aperçu par défaut ; --apply pour appliquer ; les
 * confirmations ne partent qu'avec --notify et seulement pour un séjour à venir (inutile d'écrire à un client après son séjour).
 */
class RegularizePaidCancelledBookings extends Command
{
    protected $signature = 'payments:regularize-cancelled {ids* : Numéros internes des réservations} {--apply : Appliquer (sans cette option : aperçu)} {--notify : Envoyer les confirmations (séjours à venir seulement)}';

    protected $description = "Rétablit « confirmée / payée » des réservations annulées automatiquement alors que le paiement intégral était encaissé";

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $rows = [];
        $plans = [];

        foreach ($this->argument('ids') as $id) {
            [$plan, $reason] = $this->plan((int) $id);
            if ($plan === null) {
                $rows[] = [$id, 'REFUSÉE', $reason];
                continue;
            }
            $plans[] = $plan;
            $rows[] = [$id, $apply ? 'régularisée' : 'régularisable', $plan['summary']];
        }

        $this->table(['Réservation', 'Décision', 'Détail'], $rows);

        if (!$apply) {
            $this->warn(count($plans) . ' régularisable(s). Relancez avec --apply (et --notify pour prévenir client et hôte d\'un séjour à venir).');
            return self::SUCCESS;
        }

        foreach ($plans as $plan) {
            $this->regularize($plan);
        }
        $this->info(count($plans) . ' réservation(s) régularisée(s).');

        return self::SUCCESS;
    }

    /** @return array{0: ?array, 1: string} */
    private function plan(int $id): array
    {
        $booking = Booking::find($id);
        if (!$booking) {
            return [null, 'introuvable'];
        }
        if ($booking->status !== BookingStatus::Cancelled) {
            return [null, "n'est pas annulée (" . $booking->status->value . ')'];
        }
        if ((float) $booking->refund_amount > 0 || $booking->refunded_at) {
            return [null, 'déjà remboursée : décision humaine'];
        }

        $payment = Payment::where('booking_id', $id)->where('purpose', 'full')->where('status', 'completed')->orderByDesc('id')->first();
        if (!$payment) {
            return [null, 'aucun paiement intégral encaissé'];
        }
        $paid = (float) Payment::where('booking_id', $id)->where('status', 'completed')->sum('amount');
        $probe = clone $booking;
        $probe->amount_paid = min((float) $booking->total_price, $paid);
        if (!PaymentSettlement::fullPaymentCovers($probe)) {
            return [null, 'le montant encaissé ne couvre pas le tarif de paiement intégral'];
        }

        $credits = ClientCredit::where('source_booking_id', $id)->get();
        if ($credits->contains(fn (ClientCredit $c) => $c->status === ClientCredit::STATUS_USED)) {
            return [null, "l'avoir créé à l'annulation a déjà été utilisé : décision humaine"];
        }

        $future = $booking->check_out->isFuture();
        if ($future && ($conflict = $this->conflict($booking))) {
            return [null, $conflict];
        }

        $voided = $credits->where('status', ClientCredit::STATUS_AVAILABLE);

        return [[
            'booking' => $booking, 'payment' => $payment, 'future' => $future, 'credits' => $voided,
            'summary' => number_format($paid, 0, ',', ' ') . ' FCFA encaissés'
                . ($voided->isNotEmpty() ? ', avoir de ' . number_format((float) $voided->sum('amount'), 0, ',', ' ') . ' FCFA annulé' : '')
                . ($future ? ', séjour à venir' : ', séjour passé : aucune confirmation envoyée'),
        ], ''];
    }

    private function conflict(Booking $booking): ?string
    {
        if ($booking->room_id) {
            try {
                app(BookingService::class)->assertAvailable(
                    $booking->room_id, $booking->check_in, $booking->check_out, $booking->id, max(1, (int) $booking->rooms_quantity)
                );
            } catch (\Throwable $e) {
                return 'dates plus disponibles : ' . $e->getMessage();
            }

            return null;
        }

        $taken = Booking::where('id', '!=', $booking->id)
            ->where('accommodation_id', $booking->accommodation_id)
            ->whereNull('room_id')
            ->whereIn('status', BookingStatus::occupying())
            ->where('check_in', '<', $booking->check_out)
            ->where('check_out', '>', $booking->check_in)
            ->exists();

        return $taken ? 'dates plus disponibles (autre réservation confirmée sur la même période)' : null;
    }

    private function regularize(array $plan): void
    {
        DB::transaction(function () use ($plan) {
            $booking = Booking::lockForUpdate()->findOrFail($plan['booking']->id);
            $payment = $plan['payment'];

            // L'argent n'est plus à rendre : l'avoir créé à l'annulation est annulé (il n'a pas servi).
            foreach ($plan['credits'] as $credit) {
                $credit->update(['status' => ClientCredit::STATUS_EXPIRED]);
            }

            // Le paiement est ajouté à nouveau par la mise à jour d'état : on repart des autres paiements encaissés.
            $booking->amount_paid = (float) Payment::where('booking_id', $booking->id)->where('status', 'completed')->where('id', '!=', $payment->id)->sum('amount');
            $booking->payment_status = 'pending';
            $booking->status = BookingStatus::Pending;   // « annulée » est un état terminal : on le quitte ici, de façon tracée
            $booking->save();

            app(BookingService::class)->logHistory(
                $booking, BookingStatus::Cancelled, BookingStatus::Pending, 'regularized', null,
                "Régularisation : le paiement intégral au tarif annoncé (réduction comprise) était encaissé mais non reconnu ; l'annulation automatique et l'avoir associé sont annulés."
            );

            $confirmed = app(PaymentController::class)->finalizeAfterPayment($payment->fresh(), (bool) $this->option('notify') && $plan['future']);

            if ($confirmed->payment_status !== 'paid' || $confirmed->status !== BookingStatus::Confirmed) {
                throw new \RuntimeException("La réservation {$booking->id} n'a pas pu être régularisée.");
            }
        });
    }
}
