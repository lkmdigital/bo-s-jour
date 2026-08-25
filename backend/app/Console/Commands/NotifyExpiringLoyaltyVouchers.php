<?php

namespace App\Console\Commands;

use App\Models\LoyaltyVoucher;
use App\Services\LoyaltyService;
use Illuminate\Console\Command;

/**
 * "Arrive près de l'expiration d'un bon" (brief Programme de Fidélité,
 * notification #7). Planifiée quotidiennement : une fenêtre glissante de 24h
 * (J-7 à J-6) sert d'idempotence naturelle sans colonne dédiée, même principe
 * que les autres commandes planifiées de relance de ce projet — chaque bon
 * n'est capté qu'une seule fois en traversant la fenêtre.
 */
class NotifyExpiringLoyaltyVouchers extends Command
{
    protected $signature = 'loyalty:notify-expiring-vouchers {--dry-run : Ne pas envoyer les notifications}';

    protected $description = "Notifie les voyageurs dont un bon de fidélité expire dans environ 7 jours";

    public function handle(LoyaltyService $loyaltyService): int
    {
        $dryRun = $this->option('dry-run');

        $vouchers = LoyaltyVoucher::where('status', 'available')
            ->whereBetween('expires_at', [now()->addDays(6), now()->addDays(7)])
            ->with('user')
            ->get();

        $notified = 0;
        $skipped = 0;

        foreach ($vouchers as $voucher) {
            if (!$voucher->user) {
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $this->line("Notifierait l'utilisateur #{$voucher->user_id} pour le bon {$voucher->code} (expire le {$voucher->expires_at?->format('d/m/Y')})");
                $notified++;
                continue;
            }

            $loyaltyService->notify(
                $voucher->user,
                'voucher_expiring',
                "Votre bon {$voucher->code} (-{$voucher->discount_percent}%) expire le {$voucher->expires_at?->format('d/m/Y')}. Pensez à l'utiliser !",
                ['voucher_id' => $voucher->id, 'voucher_code' => $voucher->code]
            );
            $notified++;
        }

        $this->info("Terminé. Bons notifiés : {$notified}, ignorés : {$skipped}." . ($dryRun ? ' (dry-run)' : ''));
        return 0;
    }
}
