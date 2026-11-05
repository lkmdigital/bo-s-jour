<?php

namespace App\Support\Security;

use App\Models\Accommodation;
use App\Models\User;

/**
 * Ce qu'un endpoint PUBLIC (sans authentification) a le droit de montrer d'un compte ou d'un établissement.
 *
 * Listes BLANCHES (champs autorisés) plutôt que listes noires : un champ ajouté un jour au modèle User ne devient pas
 * public par accident. C'est ce qui s'était produit avec SensitiveUserFields, qui masque les documents et les coordonnées
 * bancaires mais laissait passer l'e-mail, le téléphone, l'identifiant Google ou l'adresse IP de dernière connexion de
 * l'hôte — constat du 2026-11-05 sur GET /api/accommodations et /api/accommodations/{id}, puis sur la liste des avis
 * (e-mail et téléphone des voyageurs) et les routes des chambres (adresse privée de synchronisation iCal).
 */
final class PublicExposure
{
    /** L'hôte, sur une fiche : de quoi écrire « proposé par … ». */
    public const HOST_FIELDS = ['id', 'name', 'first_name', 'establishment_name', 'avatar'];

    /** L'auteur d'un avis : son nom et sa photo, jamais plus (aligné sur ReviewController::all). */
    public const REVIEWER_FIELDS = ['id', 'name', 'avatar'];

    /** Réglages internes d'un établissement, sans usage public : calendrier iCal, relances, mise en relation. */
    public const ACCOMMODATION_INTERNAL_FIELDS = [
        'ical_import_url', 'ical_last_synced_at', 'ical_last_sync_status', 'ical_last_sync_error', 'ical_last_sync_events_count',
        'channel_manager_interest_requested_at', 'info_confirmed_at', 'info_update_reminder_sent_at', 'submitted_for_review_at',
    ];

    /** Établissement vu par le public : hôte réduit à son identité publique, réglages internes retirés. */
    public static function accommodation(Accommodation $accommodation): void
    {
        $accommodation->host?->setVisible(self::HOST_FIELDS);
        $accommodation->makeHidden(self::ACCOMMODATION_INTERNAL_FIELDS);
    }

    public static function reviewer(?User $user): void
    {
        $user?->setVisible(self::REVIEWER_FIELDS);
    }
}
