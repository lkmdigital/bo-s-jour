<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\RoomAvailability;
use App\Services\CancellationPolicyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class RemindAndCancelUnpaidBookings extends Command
{
    protected $signature = 'bookings:remind-cancel-unpaid';

    protected $description = 'Rappelle les réservations impayées >2 jours et annule celles à J-1 non soldées';

    public function handle(): int
    {
        $now = now();

        // 1) Rappels : réservations non payées, non annulées, créées il y a plus de 2 jours
        $remindBookings = Booking::where('status', '!=', 'cancelled')
            ->whereNotIn('payment_status', ['paid', 'guarantee_paid'])
            ->where('created_at', '<=', $now->clone()->subDays(2))
            ->where('check_in', '>', $now) // uniquement celles à venir
            ->with(['user', 'accommodation'])
            ->get();

        foreach ($remindBookings as $booking) {
            if (!$booking->user?->email) {
                \Log::warning('Reminder skipped: no user email', ['booking_id' => $booking->id]);
                continue;
            }

            try {
                $subject = 'Rappel : soldez votre réservation';
                $body = sprintf(
                    "Bonjour %s,\n\nVotre réservation #%d pour %s n'est pas encore soldée. Merci de finaliser le paiement.\nArrivée : %s\nMontant dû : %.2f\n\nCeci est un rappel automatique.",
                    $booking->user->name ?? 'client',
                    $booking->id,
                    $booking->accommodation->name ?? 'votre hébergement',
                    $booking->check_in?->format('Y-m-d'),
                    max((float) $booking->total_price - (float) $booking->amount_paid, 0)
                );

                Mail::raw($body, function ($message) use ($booking, $subject) {
                    $message->to($booking->user->email)
                        ->subject($subject);
                });

                \Log::info('Reminder email sent for unpaid booking >2 days', [
                    'booking_id' => $booking->id,
                    'user_email' => $booking->user->email,
                ]);
            } catch (\Throwable $e) {
                \Log::error('Failed to send reminder email', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // 2) Annulation : réservations non payées à J-1 (ou aujourd'hui) de l'arrivée
        $cancelBookings = Booking::where('status', '!=', 'cancelled')
            ->whereNotIn('payment_status', ['paid', 'guarantee_paid'])
            ->whereBetween('check_in', [$now, $now->clone()->addDay()])
            ->with(['user'])
            ->get();

        $cancelledCount = 0;

        foreach ($cancelBookings as $booking) {
            DB::transaction(function () use ($booking, &$cancelledCount) {
                $booking->update([
                    'status' => 'cancelled',
                    'payment_status' => 'cancelled',
                ]);

                CancellationPolicyService::onBookingCancelled($booking);

                if ($booking->room_id) {
                    $dates = $this->getDatesBetween($booking->check_in, $booking->check_out);
                    if (!empty($dates)) {
                        RoomAvailability::where('room_id', $booking->room_id)
                            ->whereIn('date', $dates)
                            ->update(['status' => 'available']);
                    }
                }

                $cancelledCount++;

                // Notification mail (best-effort)
                if ($booking->user?->email) {
                    try {
                        $subject = 'Réservation annulée (paiement non reçu)';
                        $body = sprintf(
                            "Bonjour %s,\n\nVotre réservation #%d a été annulée faute de paiement avant l'arrivée.\nArrivée initiale : %s\n\nPour toute question, contactez le support.",
                            $booking->user->name ?? 'client',
                            $booking->id,
                            $booking->check_in?->format('Y-m-d')
                        );
                        Mail::raw($body, function ($message) use ($booking, $subject) {
                            $message->to($booking->user->email)
                                ->subject($subject);
                        });
                    } catch (\Throwable $e) {
                        \Log::error('Failed to send cancellation email', [
                            'booking_id' => $booking->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                \Log::info('Booking auto-cancelled at J-1 unpaid', [
                    'booking_id' => $booking->id,
                    'user_id' => $booking->user_id,
                    'amount_paid' => $booking->amount_paid,
                    'total_price' => $booking->total_price,
                ]);
            });
        }

        $this->info(sprintf(
            'Rappels envoyés: %d | Annulations: %d',
            $remindBookings->count(),
            $cancelledCount
        ));

        return self::SUCCESS;
    }

    private function getDatesBetween($start, $end): array
    {
        $dates = [];
        $current = strtotime($start);
        $endTime = strtotime($end);

        while ($current < $endTime) {
            $dates[] = date('Y-m-d', $current);
            $current = strtotime('+1 day', $current);
        }

        return $dates;
    }
}












