<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Exceptions\InvalidBookingTransitionException;
use App\Exceptions\RoomNotAvailableException;
use App\Models\Booking;
use App\Models\BookingHistory;
use App\Models\Room;
use App\Models\RoomAvailability;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingService
{
    /**
     * Vérification de disponibilité ATOMIQUE — à appeler dans une transaction
     * avec lockForUpdate() actif sur la ligne room.
     *
     * Couvre tous les cas de chevauchement :
     *   |--- existing ---|
     *         |--- requested ---|   ✓ conflit
     *   |-------- existing --------|
     *       |-- requested --|       ✓ conflit
     *   |-- existing --|
     *                    |-- req --|  pas de conflit
     */
    public function assertAvailable(int $roomId, Carbon $checkIn, Carbon $checkOut, ?int $excludeBookingId = null): void
    {
        $query = Booking::where('room_id', $roomId)
            ->whereIn('status', BookingStatus::occupying())
            ->where('check_in', '<', $checkOut)
            ->where('check_out', '>', $checkIn)
            ->lockForUpdate();

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        if ($query->exists()) {
            throw new RoomNotAvailableException(
                'Cette chambre n\'est plus disponible pour les dates sélectionnées.'
            );
        }

        // Blocages manuels par l'hôte
        $blocked = RoomAvailability::where('room_id', $roomId)
            ->where('status', 'blocked')
            ->where('date', '>=', $checkIn->toDateString())
            ->where('date', '<', $checkOut->toDateString())
            ->lockForUpdate()
            ->exists();

        if ($blocked) {
            throw new RoomNotAvailableException(
                'L\'hôte a bloqué cette période. Veuillez choisir d\'autres dates.'
            );
        }
    }

    /**
     * Bloquer les dates dans room_availabilities après création d'une réservation.
     * Utilise upsert pour gérer les éventuelles lignes existantes.
     */
    public function blockDates(int $roomId, Carbon $checkIn, Carbon $checkOut): void
    {
        $dates = [];
        $cursor = $checkIn->copy();

        while ($cursor->lt($checkOut)) {
            $dates[] = [
                'room_id'    => $roomId,
                'date'       => $cursor->toDateString(),
                'status'     => 'occupied',
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $cursor->addDay();
        }

        if (!empty($dates)) {
            RoomAvailability::upsert(
                $dates,
                ['room_id', 'date'],
                ['status', 'updated_at']
            );
        }
    }

    /**
     * Libérer les dates après annulation ou modification.
     */
    public function releaseDates(int $roomId, Carbon $checkIn, Carbon $checkOut): void
    {
        RoomAvailability::where('room_id', $roomId)
            ->where('status', 'occupied')
            ->where('date', '>=', $checkIn->toDateString())
            ->where('date', '<', $checkOut->toDateString())
            ->update(['status' => 'available', 'updated_at' => now()]);
    }

    /**
     * Confirmer une réservation.
     * Déclenche les notifications via queue.
     */
    public function confirm(Booking $booking, ?int $actorId = null): Booking
    {
        $this->transition($booking, BookingStatus::Confirmed, 'confirmed', $actorId);

        // Dispatch notifications en queue (non bloquant)
        dispatch(new \App\Jobs\SendBookingConfirmation($booking))
            ->onQueue('notifications');

        // Programmer le rappel J-1
        $reminderAt = Carbon::parse($booking->check_in)->subDay();
        if ($reminderAt->isFuture()) {
            dispatch(new \App\Jobs\SendBookingReminder($booking))
                ->delay($reminderAt)
                ->onQueue('notifications');
        }

        Log::info('Booking confirmed', [
            'booking_id' => $booking->id,
            'actor_id'   => $actorId,
        ]);

        return $booking->fresh();
    }

    /**
     * Annuler une réservation — libère les dates et notifie.
     */
    public function cancel(Booking $booking, string $reason = '', ?int $actorId = null): Booking
    {
        DB::transaction(function () use ($booking, $reason, $actorId) {
            $this->transition($booking, BookingStatus::Cancelled, 'cancelled', $actorId, $reason);

            if ($booking->room_id) {
                $this->releaseDates(
                    $booking->room_id,
                    Carbon::parse($booking->check_in),
                    Carbon::parse($booking->check_out)
                );
            }
        });

        dispatch(new \App\Jobs\SendBookingCancellation($booking, $reason))
            ->onQueue('notifications');

        return $booking->fresh();
    }

    /**
     * Marquer une réservation comme terminée (après check-out).
     */
    public function complete(Booking $booking, ?int $actorId = null): Booking
    {
        $this->transition($booking, BookingStatus::Completed, 'completed', $actorId);

        return $booking->fresh();
    }

    /**
     * Modifier les dates d'une réservation confirmée ou en attente.
     * Libère les anciennes dates, vérifie les nouvelles, les bloque.
     */
    public function modifyDates(
        Booking $booking,
        Carbon $newCheckIn,
        Carbon $newCheckOut,
        ?int $actorId = null
    ): Booking {
        DB::transaction(function () use ($booking, $newCheckIn, $newCheckOut, $actorId) {
            $oldCheckIn  = Carbon::parse($booking->check_in);
            $oldCheckOut = Carbon::parse($booking->check_out);
            $roomId      = $booking->room_id;

            if ($roomId) {
                // Verrou sur la chambre
                Room::lockForUpdate()->findOrFail($roomId);

                // Libérer les anciennes dates
                $this->releaseDates($roomId, $oldCheckIn, $oldCheckOut);

                // Vérifier les nouvelles (en excluant cette réservation)
                $this->assertAvailable($roomId, $newCheckIn, $newCheckOut, $booking->id);

                // Bloquer les nouvelles dates
                $this->blockDates($roomId, $newCheckIn, $newCheckOut);
            }

            $booking->update([
                'check_in'  => $newCheckIn->toDateString(),
                'check_out' => $newCheckOut->toDateString(),
            ]);

            $this->logHistory($booking, $booking->status, $booking->status, 'modified', $actorId, null, [
                'old_check_in'  => $oldCheckIn->toDateString(),
                'old_check_out' => $oldCheckOut->toDateString(),
                'new_check_in'  => $newCheckIn->toDateString(),
                'new_check_out' => $newCheckOut->toDateString(),
            ]);
        });

        return $booking->fresh();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Méthodes internes
    // ─────────────────────────────────────────────────────────────────────────

    private function transition(
        Booking $booking,
        BookingStatus $to,
        string $action,
        ?int $actorId,
        ?string $note = null
    ): void {
        if (!$booking->canTransitionTo($to)) {
            throw new InvalidBookingTransitionException(
                "Transition {$booking->status->value} → {$to->value} non autorisée."
            );
        }

        $from = $booking->status;
        $booking->update(['status' => $to->value]);
        $this->logHistory($booking, $from, $to, $action, $actorId, $note);
    }

    public function logHistory(
        Booking $booking,
        BookingStatus $from,
        BookingStatus $to,
        string $action,
        ?int $actorId = null,
        ?string $note = null,
        ?array $meta = null
    ): void {
        BookingHistory::create([
            'booking_id'  => $booking->id,
            'user_id'     => $actorId,
            'from_status' => $from->value,
            'to_status'   => $to->value,
            'action'      => $action,
            'note'        => $note,
            'meta'        => $meta,
            'ip_address'  => request()->ip(),
        ]);
    }
}
