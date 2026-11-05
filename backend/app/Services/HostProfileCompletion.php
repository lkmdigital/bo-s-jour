<?php

namespace App\Services;

/**
 * Pourcentage de complétion du profil d'un partenaire.
 *
 * Deux calculs, selon que les documents sont obligatoires ou non (voir PartnerDocuments) :
 * - OBLIGATOIRES : le calcul historique, inchangé (informations de contact + numéros et documents de conformité) ;
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

    /** Calcul historique (documents obligatoires), repris tel quel de HostProfileController. */
    private static function withDocuments($user): int
    {
        $requiredFields = self::CONTACT_FIELDS + [
            'rccm' => 5,
            'tax_account_number' => 5,
            'id_type' => 10,
            'id_number' => 10,
            'id_document_path' => 15, // Pour passeport ou autre
            'id_document_recto_path' => 7.5, // Pour CNI/Permis (recto)
            'id_document_verso_path' => 7.5, // Pour CNI/Permis (verso)
            'proof_of_address_path' => 15,
            'business_license_path' => 10,
            'rccm_document_path' => 10,
            'tax_document_path' => 10,
        ];

        $total = 0;
        foreach ($requiredFields as $field => $points) {
            if (!empty($user->getAttribute($field))) {
                $total += $points;
            }
        }

        // Pour CNI et Permis, recto ET verso sont nécessaires : un seul côté ne compte pas.
        $idType = $user->getAttribute('id_type');
        if (in_array($idType, ['CNI', 'Permis de conduire'])) {
            $hasRecto = !empty($user->getAttribute('id_document_recto_path'));
            $hasVerso = !empty($user->getAttribute('id_document_verso_path'));
            if (!($hasRecto && $hasVerso)) {
                if ($hasRecto) {
                    $total -= 7.5;
                }
                if ($hasVerso) {
                    $total -= 7.5;
                }
            }
        }

        return (int) min(100, $total);
    }
}
