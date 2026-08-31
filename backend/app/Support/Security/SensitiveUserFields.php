<?php

namespace App\Support\Security;

/**
 * Champs du modèle User jamais destinés à un affichage public : documents
 * d'identité/conformité, coordonnées bancaires, identifiants fiscaux/légaux.
 *
 * Introduit en urgence le 2026-08-28 après constat d'une exposition en production
 * (audit sécurité) : plusieurs endpoints publics ou faiblement protégés chargeaient
 * une relation `host`/`user` et la sérialisaient brute, sans filtrage.
 *
 * Volontairement appliqué via makeHidden() au cas par cas (endpoint par endpoint),
 * PAS ajouté à User::$hidden globalement : de nombreuses pages légitimes (profil
 * hôte, documents, finances, revue admin) lisent ces mêmes champs depuis d'autres
 * contrôleurs et ne doivent pas être affectées par ce correctif.
 */
final class SensitiveUserFields
{
    public const DOCUMENTS_AND_FINANCIAL = [
        'id_document_path', 'id_document_recto_path', 'id_document_verso_path',
        'proof_of_address_path', 'business_license_path', 'rccm_document_path', 'tax_document_path',
        'bank_name', 'bank_account_holder', 'bank_account_number',
        'tax_account_number', 'rccm', 'id_number', 'cnps_number',
        'date_of_birth', 'verification_notes',
    ];

    /** Pour un tiers (avis, réservation) affiché à quelqu'un d'autre : en plus des
     * champs ci-dessus, aucune coordonnée de contact n'a sa place dans la réponse. */
    public const DOCUMENTS_FINANCIAL_AND_CONTACT = [
        ...self::DOCUMENTS_AND_FINANCIAL,
        'email', 'phone', 'phone_fixed', 'whatsapp', 'address_line1', 'address_line2',
    ];
}
