<?php

namespace App\Mail;

use App\Models\Accommodation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Demande utilisateur 2026-09-13/14 : rappel de mise à jour des informations
 * pour un établissement non reconfirmé depuis
 * Accommodation::INFO_UPDATE_REMINDER_MONTHS mois — distinct de
 * ComplianceReminder (documents d'identité de l'hôte, pas la fiche
 * établissement elle-même).
 */
class AccommodationInfoUpdateReminder extends Mailable
{
    use Queueable, SerializesModels;

    public string $hostName;
    public string $accommodationName;
    public string $editUrl;

    public function __construct(string $hostName, string $accommodationName, string $editUrl)
    {
        $this->hostName = $hostName;
        $this->accommodationName = $accommodationName;
        $this->editUrl = $editUrl;
    }

    public static function forAccommodation(Accommodation $accommodation): self
    {
        $frontend = rtrim((string) config('services.frontend_url'), '/');

        return new self(
            $accommodation->host?->name ?? 'cher partenaire',
            $accommodation->name,
            $frontend . '/dashboard/host/accommodations/' . $accommodation->id . '/edit'
        );
    }

    public function build()
    {
        return $this->subject('Merci de confirmer les informations de « ' . $this->accommodationName . ' »')
            ->view('emails.accommodation-info-update-reminder', [
                'hostName' => $this->hostName,
                'accommodationName' => $this->accommodationName,
                'editUrl' => $this->editUrl,
            ]);
    }
}
