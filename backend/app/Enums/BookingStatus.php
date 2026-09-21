<?php

namespace App\Enums;

enum BookingStatus: string
{
    // Retour client 2026-09-16 : parcours "confirmation hôte avant paiement" —
    // en attendant l'intégration Channel Manager/PMS temps réel, l'hôte doit
    // valider la disponibilité AVANT que le voyageur puisse payer. Ce statut
    // précède Pending ; Pending garde son sens actuel inchangé ("hôte a
    // confirmé, payable maintenant") pour que tout le code existant (paiement,
    // job d'expiration 48h, libellés...) continue de fonctionner sans
    // modification pour les réservations déjà en base.
    case AwaitingHostConfirmation = 'awaiting_host_confirmation';
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';

    public function label(): string
    {
        return match($this) {
            self::AwaitingHostConfirmation => "En attente de confirmation du partenaire",
            self::Pending   => 'En attente',
            self::Confirmed => 'Confirmée',
            self::Cancelled => 'Annulée',
            self::Completed => 'Terminée',
        };
    }

    public function labelEn(): string
    {
        return match($this) {
            self::AwaitingHostConfirmation => 'Awaiting host confirmation',
            self::Pending   => 'Pending',
            self::Confirmed => 'Confirmed',
            self::Cancelled => 'Cancelled',
            self::Completed => 'Completed',
        };
    }

    /**
     * Transitions autorisées selon le statut courant.
     * awaiting_host_confirmation → pending | confirmed | cancelled
     * pending   → confirmed | cancelled
     * confirmed → cancelled | completed
     * cancelled → (terminal)
     * completed → (terminal)
     *
     * "awaiting_host_confirmation → confirmed" reste autorisé directement pour
     * préserver la capacité admin de forcer une confirmation sans paiement
     * (BookingController::update(), déjà couvert par AdminBookingActionsTest).
     */
    public function canTransitionTo(self $next): bool
    {
        return match($this) {
            self::AwaitingHostConfirmation => in_array($next, [self::Pending, self::Confirmed, self::Cancelled]),
            self::Pending   => in_array($next, [self::Confirmed, self::Cancelled]),
            self::Confirmed => in_array($next, [self::Cancelled, self::Completed]),
            self::Cancelled,
            self::Completed => false,
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Cancelled, self::Completed]);
    }

    public function isActive(): bool
    {
        return in_array($this, [self::AwaitingHostConfirmation, self::Pending, self::Confirmed]);
    }

    /** Valeurs qui occupent une chambre (à exclure lors du calcul de disponibilité) */
    public static function occupying(): array
    {
        return [self::Confirmed->value];
    }
}
