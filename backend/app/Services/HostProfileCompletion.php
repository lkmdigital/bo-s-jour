<?php

namespace App\Services;

use App\Models\HostDocumentType;

/**
 * Pourcentage de complétion du profil d'un partenaire.
 *
 * Deux calculs, selon que les documents sont obligatoires ou non (voir PartnerDocuments) :
 * - OBLIGATOIRES : informations de contact + numéros + les documents que l'administrateur a cochés obligatoires ;
 * - FACULTATIFS : seules les informations de contact marquées d'une étoile sur la page Profil comptent, ramenées à
 *   100 %. La biographie et le WhatsApp de l'établissement, présentés comme facultatifs, ne bloquent personne :
 *   avant, un partenaire qui avait rempli tout ce qui est marqué restait à 79 % et ne pouvait pas ajouter d'hébergement.
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

    /** Informations de contact facultatives : elles améliorent la fiche mais ne bloquent jamais l'ajout d'un hébergement. */
    public const OPTIONAL_CONTACT_FIELDS = ['bio', 'whatsapp'];

    /** Libellés (page Profil) des informations de contact, pour dire au partenaire ce qu'il lui reste à remplir. */
    private const CONTACT_LABELS = [
        'name' => 'Nom complet',
        'email' => 'E-mail',
        'phone' => 'Téléphone',
        'date_of_birth' => 'Date de naissance',
        'address_line1' => 'Adresse ligne 1',
        'city' => 'Ville',
        'country' => 'Pays',
        'phone_fixed' => 'Numéro établissement',
    ];

    /**
     * Informations de contact obligatoires encore manquantes (documents facultatifs), dans l'ordre de la page Profil.
     *
     * @return list<string> libellés prêts à afficher
     */
    public static function missingContactLabels($user): array
    {
        $missing = [];
        foreach (self::CONTACT_LABELS as $field => $label) {
            if (empty($user->getAttribute($field))) {
                $missing[] = $label;
            }
        }

        return $missing;
    }

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
        $required = array_diff_key(self::CONTACT_FIELDS, array_flip(self::OPTIONAL_CONTACT_FIELDS));
        $total = 0;
        foreach ($required as $field => $points) {
            if (!empty($user->getAttribute($field))) {
                $total += $points;
            }
        }

        return (int) min(100, round($total / array_sum($required) * 100));
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
