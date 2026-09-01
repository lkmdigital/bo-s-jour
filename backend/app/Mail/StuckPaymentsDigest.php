<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

/**
 * Filet de sécurité webhook Malia Pay (découverte du 2026-09-01 : 30 paiements sur 31
 * restés "pending" faute de webhook reçu depuis mai). Digest quotidien envoyé aux admins
 * listant les paiements "pending" au-delà du seuil, à croiser manuellement avec le
 * dashboard marchand Malia Pay — voir App\Console\Commands\FlagStuckPendingPayments et
 * Admin\AdminPaymentController::confirmManually().
 */
class StuckPaymentsDigest extends Mailable
{
    use Queueable, SerializesModels;

    public Collection $payments;
    public int $thresholdHours;
    public string $dashboardUrl;

    public function __construct(Collection $payments, int $thresholdHours, string $dashboardUrl)
    {
        $this->payments = $payments;
        $this->thresholdHours = $thresholdHours;
        $this->dashboardUrl = $dashboardUrl;
    }

    public function build()
    {
        $count = $this->payments->count();

        return $this->subject("{$count} paiement(s) en attente à vérifier — bo séjour")
            ->view('emails.stuck-payments-digest', [
                'payments' => $this->payments,
                'thresholdHours' => $this->thresholdHours,
                'dashboardUrl' => $this->dashboardUrl,
            ]);
    }
}
