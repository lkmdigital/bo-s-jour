<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Exceptions\InvalidBookingTransitionException;
use App\Exceptions\RoomNotAvailableException;
use App\Models\Booking;
use App\Models\BookingHistory;
use App\Models\ClientCredit;
use App\Models\Room;
use App\Models\RoomAvailability;
use Carbon\Carbon;
use App\Mail\BookingConfirmation;
use App\Mail\HostNewBooking;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
            ->where(function ($q) {
                // Une réservation confirmée bloque toujours la chambre. Une
                // réservation encore "pending" (paiement pas encore confirmé)
                // la bloque AUSSI tant que sa fenêtre n'a pas expiré — retour
                // client 2026-09-02 (Partie 4.5) : sans ce verrou temporaire,
                // deux voyageurs pouvaient payer en même temps pour la même
                // chambre pendant que l'un des deux était encore sur la
                // passerelle de paiement (occupying() n'incluait que
                // "confirmed"). Une fois expirée (ou déjà annulée par le
                // nettoyage planifié), une réservation pending ne bloque plus.
                $q->whereIn('status', BookingStatus::occupying())
                    ->orWhere(function ($pending) {
                        $pending->where('status', BookingStatus::Pending->value)
                            ->where(function ($notExpired) {
                                $notExpired->whereNull('expires_at')->orWhere('expires_at', '>', now());
                            });
                    });
            })
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
     * Envoie l'email de confirmation de façon synchrone (garantie de livraison)
     * et dispatche les autres notifications en queue.
     */
    public function confirm(Booking $booking, ?int $actorId = null): Booking
    {
        $this->transition($booking, BookingStatus::Confirmed, 'confirmed', $actorId);

        // Générer le code de confirmation et le numéro de réservation si absents
        // (doivent exister avant l'envoi des emails/WhatsApp).
        $needsSave = false;
        if (empty($booking->confirmation_code)) {
            $booking->confirmation_code = \App\Models\Booking::generateConfirmationCode();
            $needsSave = true;
        }
        if (empty($booking->booking_number)) {
            $booking->booking_number = \App\Models\Booking::generateBookingNumber();
            $needsSave = true;
        }
        if ($needsSave) {
            $booking->save();
        }

        // Bloquer les dates uniquement lors de la confirmation (après paiement)
        if ($booking->room_id) {
            $this->blockDates(
                $booking->room_id,
                Carbon::parse($booking->check_in),
                Carbon::parse($booking->check_out)
            );
        }

        $booking->load(['user', 'accommodation', 'room']);

        // Email de confirmation au client — synchrone, garanti
        // Chaque tentative est aussi tracée dans notification_logs (retour
        // client 2026-09-02, Partie 4.3 : "événements de notification"),
        // consultable depuis le détail admin de la réservation.
        if ($booking->user?->email) {
            try {
                Mail::to($booking->user->email)->send(new BookingConfirmation($booking));
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'traveler', $booking->user->email, true);
            } catch (\Throwable $e) {
                Log::error('Booking confirmation email (client) failed', [
                    'booking_id' => $booking->id,
                    'error'      => $e->getMessage(),
                ]);
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'traveler', $booking->user->email, false, $e->getMessage());
            }
        }

        // Email de notification à l'hôte — synchrone, garanti
        $hostEmail = $booking->accommodation?->host?->email;
        if ($hostEmail) {
            try {
                Mail::to($hostEmail)->send(new HostNewBooking($booking));
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'host', $hostEmail, true);
            } catch (\Throwable $e) {
                Log::error('Booking confirmation email (host) failed', [
                    'booking_id' => $booking->id,
                    'error'      => $e->getMessage(),
                ]);
                \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'email', 'host', $hostEmail, false, $e->getMessage());
            }
        }

        // Confirmation par SMS (best-effort, en plus des emails)
        try {
            $sms = app(\App\Services\SmsService::class);
            $sms->sendBookingConfirmationToClient($booking);
            $sms->sendBookingNotificationToHost($booking);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'sms', 'traveler', $booking->user?->phone, true);
        } catch (\Throwable $e) {
            Log::error('Booking confirmation SMS failed', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'sms', 'traveler', $booking->user?->phone, false, $e->getMessage());
        }

        // Double confirmation : WhatsApp (best-effort, en plus de l'e-mail)
        try {
            app(\App\Services\WhatsAppService::class)->sendBookingConfirmation($booking);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'whatsapp', 'traveler', $booking->user?->phone, true);
        } catch (\Throwable $e) {
            Log::error('Booking confirmation WhatsApp failed', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);
            \App\Models\NotificationLog::record($booking->id, 'booking_confirmed', 'whatsapp', 'traveler', $booking->user?->phone, false, $e->getMessage());
        }

        // Notification in-app (database) via queue
        dispatch(new \App\Jobs\SendBookingConfirmation($booking))
            ->onQueue('notifications');

        // Rappel J-1 via queue
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
        // NB : l'avoir voyageur est généré par CancellationPolicyService::onBookingCancelled (appelé par le contrôleur).
    }

    /**
     * Refus d'une réservation par l'établissement (mode "sur demande").
     * -> Remboursement intégral automatique (le voyageur n'est pas fautif) ; PAS d'avoir.
     */
    public function refuse(Booking $booking, string $reason = '', ?int $actorId = null): Booking
    {
        DB::transaction(function () use ($booking, $reason, $actorId) {
            $this->transition($booking, BookingStatus::Cancelled, 'cancelled', $actorId, $reason ?: "Demande refusée par l'établissement");

            if ($booking->room_id) {
                $this->releaseDates($booking->room_id, Carbon::parse($booking->check_in), Carbon::parse($booking->check_out));
            }

            $refund = (float) $booking->amount_paid;
            $booking->update([
                'refund_amount' => $refund,
                'refunded_at' => $refund > 0 ? now() : null,
                'payment_status' => $refund > 0 ? 'refunded' : $booking->payment_status,
            ]);

            if ($refund > 0) {
                // Remboursement automatique (≤ 24h) via la passerelle : hook (dépend du client).
                Log::info('Auto refund to process (host refusal)', ['booking_id' => $booking->id, 'amount' => $refund]);
                // TODO: app(\App\Services\PaymentRefundService::class)->refund($booking, $refund);
            }
        });

        dispatch(new \App\Jobs\SendBookingCancellation($booking, $reason))->onQueue('notifications');

        return $booking->fresh();
    }

    /**
     * Marquer une réservation comme No Show (absence de check-in).
     * L'établissement conserve l'acompte : aucun remboursement ni avoir.
     */
    public function markNoShow(Booking $booking, ?int $actorId = null): Booking
    {
        $booking->update([
            'no_show_at' => now(),
            'refund_amount' => 0,
            'credit_amount' => 0,
        ]);
        $this->logHistory($booking, $booking->status, $booking->status, 'no_show', $actorId, 'Absence de check-in détectée — acompte conservé');

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
