<?php

namespace App\Support;

/** Écriture unique des noms de ville : « KORHOGO », « korhogo » et « Korhogo » deviennent « Korhogo ». */
final class CityName
{
    public static function normalize(?string $city): ?string
    {
        if ($city === null) {
            return null;
        }

        $city = trim(preg_replace('/\s+/u', ' ', $city) ?? '');
        if ($city === '') {
            return '';
        }

        // Majuscule à chaque mot, après un tiret ou une virgule (« Grand-Bassam », « Fouénan, Touba »).
        return mb_convert_case(mb_strtolower($city, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
    }
}
