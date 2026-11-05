<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Les documents de conformité des partenaires (pièce d'identité, justificatif de domicile, licence, RCCM, document fiscal
 * et leurs numéros) sont-ils OBLIGATOIRES pour ajouter un établissement ?
 *
 * Décision bosejour du 2026-11-05 : FACULTATIFS pour le moment — ils bloquaient beaucoup de partenaires. Le super
 * administrateur peut les rendre obligatoires « au moment venu » (Paramètres > Documents partenaires). Tant qu'ils sont
 * facultatifs : plus de profil à 100 % documents compris, plus de validation du compte par un administrateur avant
 * d'ajouter un établissement, plus de relances de conformité. Les informations de contact restent demandées.
 */
final class PartnerDocuments
{
    public const SETTING_KEY = 'partner_documents_required';
    private const CHANGED_BY_KEY = 'partner_documents_changed_by';

    /** Facultatifs tant que le super administrateur ne les a pas rendus obligatoires. */
    public static function required(): bool
    {
        return (bool) Setting::get(self::SETTING_KEY, false);
    }

    public static function setRequired(bool $required, User $by): void
    {
        Setting::set(self::SETTING_KEY, $required, 'boolean', 'Documents partenaires obligatoires pour ajouter un établissement');
        Setting::set(self::CHANGED_BY_KEY, trim(($by->name ?: $by->email) . ' — ' . now('Africa/Abidjan')->format('d/m/Y H:i')), 'string', 'Dernière modification du réglage des documents partenaires');

        Log::info('Documents partenaires : réglage modifié', ['obligatoires' => $required, 'par_user_id' => $by->id]);
    }

    public static function lastChange(): ?string
    {
        $value = (string) Setting::get(self::CHANGED_BY_KEY, '');

        return $value !== '' ? $value : null;
    }
}
