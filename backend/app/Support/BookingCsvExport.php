<?php

namespace App\Support;

use App\Models\Booking;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Export CSV des réservations (admin et partenaire). Séparateur « ; » et BOM UTF-8 : le fichier s'ouvre directement dans Excel en
 * français. Les valeurs saisies par des tiers (noms, adresses…) sont neutralisées contre l'injection de formules (=, +, -, @).
 */
final class BookingCsvExport
{
    public const ADMIN_HEADERS = [
        'N° réservation', 'Code de confirmation', 'Créée le', 'Client', 'E-mail client', 'Téléphone client', 'Établissement', 'ID établissement',
        'Ville', 'Partenaire', 'Chambre', 'Quantité', 'N° de chambre', 'Arrivée', 'Départ', 'Nuits', 'Voyageurs', 'Statut', 'Paiement',
        'Tarif plein (FCFA)', 'Remise (FCFA)', 'Total à payer (FCFA)', 'Encaissé (FCFA)', 'Reste à payer (FCFA)',
    ];

    public const HOST_HEADERS = [
        'N° réservation', 'Code boséjour', 'Créée le', 'Client', 'E-mail client', 'Téléphone client', 'Établissement', 'Ville', 'Chambre',
        'Quantité', 'N° de chambre', 'Arrivée', 'Départ', 'Nuits', 'Voyageurs', 'Statut', 'Paiement', 'Total (FCFA)', 'Encaissé (FCFA)', 'Reste à payer (FCFA)',
    ];

    /** @param Collection<int, Booking> $bookings */
    public static function admin(Collection $bookings, string $filename): StreamedResponse
    {
        return self::stream($filename, self::ADMIN_HEADERS, $bookings->map(function (Booking $b) {
            $full = (float) ($b->base_price ?? $b->total_price);

            return [
                $b->booking_number ?: '#' . $b->id, $b->confirmation_code, self::date($b->created_at, 'd/m/Y H:i'),
                $b->user?->name, $b->user?->email, $b->user?->phone,
                $b->accommodation?->name, $b->accommodation?->establishment_code, $b->accommodation?->city, $b->accommodation?->host?->name,
                $b->room?->name, max(1, (int) $b->rooms_quantity), $b->assigned_room_number,
                self::date($b->check_in), self::date($b->check_out), self::nights($b), $b->guests,
                $b->display_status_label, $b->display_payment_status_label,
                self::money($full), self::money(max(0.0, $full - (float) $b->total_price)), self::money($b->total_price),
                self::money($b->amount_paid), self::money($b->remainingBalance()),
            ];
        }));
    }

    /** @param Collection<int, Booking> $bookings */
    public static function host(Collection $bookings, string $filename): StreamedResponse
    {
        return self::stream($filename, self::HOST_HEADERS, $bookings->map(fn (Booking $b) => [
            $b->booking_number ?: '#' . $b->id, $b->confirmation_code, self::date($b->created_at, 'd/m/Y H:i'),
            $b->user?->name, $b->user?->email, $b->user?->phone,
            $b->accommodation?->name, $b->accommodation?->city, $b->room?->name, max(1, (int) $b->rooms_quantity), $b->assigned_room_number,
            self::date($b->check_in), self::date($b->check_out), self::nights($b), $b->guests,
            $b->display_status_label, $b->display_payment_status_label,
            self::money($b->total_price), self::money($b->amount_paid), self::money($b->remainingBalance()),
        ]));
    }

    private static function stream(string $filename, array $headers, Collection $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers, ';');
            foreach ($rows as $row) {
                fputcsv($out, array_map([self::class, 'safe'], $row), ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Neutralise une cellule qui serait interprétée comme une formule par Excel / Sheets. */
    public static function safe(mixed $value): mixed
    {
        if (!is_string($value)) {
            return $value;
        }

        return $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'" . $value : $value;
    }

    private static function date(mixed $value, string $format = 'd/m/Y'): string
    {
        return $value ? \Carbon\Carbon::parse($value)->format($format) : '';
    }

    private static function nights(Booking $b): int
    {
        return (int) \Carbon\Carbon::parse($b->check_in)->diffInDays(\Carbon\Carbon::parse($b->check_out));
    }

    private static function money(mixed $amount): int
    {
        return (int) round((float) $amount);
    }
}
