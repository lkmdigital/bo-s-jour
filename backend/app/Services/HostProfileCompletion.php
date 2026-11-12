<?php

namespace App\Services;

use App\Models\HostDocumentType;

/**
 * Pourcentage de complétion du profil d'un partenaire.
 *
 * Deux calculs, selon que les documents sont obligatoires ou non (voir PartnerDocuments) :
 * - OBLIGATOIRES : informations de contact + numéros + les documents que l'administrateur a cochés obligatoires ;
 * - FACULTATIFS : seules les informations de contact comptent, ramenées à 100 %.
 */
final class HostProfileCompletion
{
    /** Informations de contact et d'identité commerciale : toujours demandées, documents ou non. */
    public const CONTACT_FIELDS = [
        'name' => 5,
        'email' => 5,
        'phone' => 10,
        'date_of_birth' => 5,
        'bio' => 5,
        'address_line1' => 10,
        'city' => 5,
        'country' => 5,
        'phone_fixed' => 10,
        'whatsapp' => 10,
    ];

    /**
     * @param \App\Models\User $user
     * @param bool|null        $documentsRequired null = réglage actuel de la plateforme
     */
    public static function percentage($user, ?bool $documentsRequired = null): int
    {
        $documentsRequired ??= PartnerDocuments::required();

        return $documentsRequired ? self::withDocuments($user) : self::contactOnly($user);
    }

    private static function contactOnly($user): int
    {
        $total = 0;
        foreach (self::CONTACT_FIELDS as $field => $points) {
            if (!empty($user->getAttribute($field))) {
                $total += $points;
            }
        }

        return (int) min(100, round($total / array_sum(self::CONTACT_FIELDS) * 100));
    }

    /** Numéros de conformité : toujours demandés quand les documents sont obligatoires. */
    private const NUMBER_FIELDS = [
        'rccm' => 5,
        'tax_account_number' => 5,
        'id_type' => 10,
        'id_number' => 10,
    ];

    /** Poids d'un document dans le pourcentage : la pièce d'identité pèse plus, les autres 10 points. */
    private const IDENTITY_DOCUMENT_POINTS = 15;
    private const OTHER_DOCUMENT_POINTS = 10;

    /**
     * Documents OBLIGATOIRES : informations de contact + numéros + chaque type de document que l'administrateur a
     * coché obligatoire (Paramètres > Documents partenaires). Un document facultatif ou retiré ne compte pas.
     * Le pourcentage n'atteint 100 que si TOUT l'obligatoire est fourni : un partenaire sans un document obligatoire
     * reste à 99 % au plus.
     */
    private static function withDocuments($user): int
    {
        $earned = 0;
        $total = 0;
        $complete = true;

        foreach (self::CONTACT_FIELDS + self::NUMBER_FIELDS as $field => $points) {
            $total += $points;
            if (!empty($user->getAttribute($field))) {
                $earned += $points;
            } else {
                $complete = false;
            }
        }

        foreach (HostDocumentType::active()->where('is_required', true) as $type) {
            $points = $type->legacy_column === 'id_document_path' ? self::IDENTITY_DOCUMENT_POINTS : self::OTHER_DOCUMENT_POINTS;
            $total += $points;
            if ($user->hasHostDocument($type)) {
                $earned += $points;
            } else {
                $complete = false;
            }
        }

        $percentage = (int) round($earned / $total * 100);

        return $complete ? 100 : min(99, $percentage);
    }
}
