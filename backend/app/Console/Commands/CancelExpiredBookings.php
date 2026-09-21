<?php

namespace App\Console\Commands;

use App\Enums\BookingStatus;
use App\Jobs\SendBookingCancellation;
use App\Models\Booking;
use App\Models\RoomAvailability;
use App\Services\CancellationPolicyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelExpiredBookings extends Command
{
    protected $signature = 'bookings:cancel-expired';

    protected $description = 'Annule automatiquement les réservations non soldées après 48h et libère les disponibilités';

    public function handle(): int
    {
        $now = now();

        $bookings = Booking::where('status', '!=', 'cancelled')
            ->where('payment_status', '!=', 'paid')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->get();

        if ($bookings->isEmpty()) {
            $this->info('Aucune réservation expirée à annuler.');
            return self::SUCCESS;
        }

        $cancelled = 0;

        foreach ($bookings as $booking) {
            // Capturé AVANT la mise à jour : détermine si cette réservation
            // expirait en attente de l'hôte (retour client 2026-09-16) ou
            // selon le cas existant (pending non payée après 48h).
            $wasAwaitingHost = $booking->status === BookingStatus::AwaitingHostConfirmation;

            DB::transaction(function () use ($booking, &$cancelled) {
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

                \Log::info('Booking auto-cancelled after 48h without full payment', [
                    'booking_id' => $booking->id,
                    'user_id' => $booking->user_id,
                    'amount_paid' => $booking->amount_paid,
                    'total_price' => $booking->total_price,
                ]);

                $cancelled++;
            });

            // Ce cas précis (délai de réponse hôte dépassé) notifie le
            // voyageur — contrairement au cas existant "48h sans paiement"
            // qui reste silencieux (comportement pré-existant, hors périmètre
            // de ce correctif). Dispatché hors transaction : un échec de
            // notification ne doit jamais annuler l'annulation elle-même.
            if ($wasAwaitingHost) {
                dispatch(new SendBookingCancellation(
                    $booking->fresh(),
                    "Le partenaire n'a pas répondu à votre demande dans le délai imparti."
                ))->onQueue('notifications');
            }
        }

        $this->info("{$cancelled} réservation(s) ont été annulées pour non-paiement.");

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

