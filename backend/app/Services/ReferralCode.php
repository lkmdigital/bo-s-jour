<?php

namespace App\Services;

use App\Models\User;

/**
 * Code de parrainage personnel d'un membre, et lien d'inscription qui le transporte.
 *
 * Le code est créé dès l'inscription (voir User::booted) : un membre n'a plus à ouvrir « Mon programme » pour en avoir un.
 * Il sert à la saisie à la main, dans un lien (/auth/register?ref=CODE) ou dans un QR code (qui encode ce lien).
 */
final class ReferralCode
{
    /** Sans I, O, 0 ni 1 : un code se dicte, se recopie ou se lit sur un écran sans confusion possible. */
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public const LENGTH = 8;

    public static function generate(): string
    {
        do {
            $code = '';
            for ($i = 0; $i < self::LENGTH; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (!PartnerReferralService::codeAvailable($code));

        return $code;
    }

    /** Lien d'inscription qui préremplit le code (le formulaire d'inscription lit `ref`). */
    public static function link(string $code): string
    {
        return rtrim((string) config('services.frontend_url', 'https://bosejour.ci'), '/') . '/auth/register?ref=' . urlencode($code);
    }
}
