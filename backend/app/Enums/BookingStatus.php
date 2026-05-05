<?php

namespace App\Enums;

enum BookingStatus: string
{
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';

    public function label(): string
    {
        return match($this) {
            self::Pending   => 'En attente',
            self::Confirmed => 'Confirmée',
            self::Cancelled => 'Annulée',
            self::Completed => 'Terminée',
        };
    }

    public function labelEn(): string
    {
        return match($this) {
            self::Pending   => 'Pending',
            self::Confirmed => 'Confirmed',
            self::Cancelled => 'Cancelled',
            self::Completed => 'Completed',
        };
    }

    /**
     * Transitions autorisées selon le statut courant.
     * pending   → confirmed | cancelled
     * confirmed → cancelled | completed
     * cancelled → (terminal)
     * completed → (terminal)
     */
    public function canTransitionTo(self $next): bool
    {
        return match($this) {
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
        return in_array($this, [self::Pending, self::Confirmed]);
    }

    /** Valeurs qui occupent une chambre (à exclure lors du calcul de disponibilité) */
    public static function occupying(): array
    {
        return [self::Pending->value, self::Confirmed->value];
    }
}
