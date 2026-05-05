<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Review;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendPostStayReviewLinks extends Command
{
    protected $signature = 'reviews:send-post-stay-links {--dry-run : Ne pas envoyer les emails ni enregistrer les tokens}';

    protected $description = 'Envoie un lien de retour client (avis) aux voyageurs dont le séjour est terminé (check_out + 1 jour)';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $baseUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://monbeaupays.loyerpay.ci')), '/');

        // Séjours terminés depuis au moins 1 jour, confirmés, lien pas encore envoyé
        $bookings = Booking::where('status', 'confirmed')
            ->where('check_out', '<=', now()->subDay())
            ->whereNull('review_link_sent_at')
            ->with(['user', 'accommodation'])
            ->get();

        $sent = 0;
        $skipped = 0;

        foreach ($bookings as $booking) {
            $alreadyReviewed = Review::where('user_id', $booking->user_id)
                ->where('accommodation_id', $booking->accommodation_id)
                ->exists();

            if ($alreadyReviewed) {
                $skipped++;
                $booking->update(['review_link_sent_at' => now()]);
                continue;
            }

            $token = Str::random(64);

            if (!$dryRun) {
                $booking->update([
                    'review_token' => $token,
                    'review_link_sent_at' => now(),
                ]);
            }

            $reviewUrl = $baseUrl . '/review/booking/' . ($dryRun ? 'TOKEN' : $token);

            if (!$booking->user?->email) {
                \Log::warning('Post-stay review link skipped: no user email', ['booking_id' => $booking->id]);
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $this->line("Would send to {$booking->user->email} for booking #{$booking->id} ({$booking->accommodation->name})");
                $sent++;
                continue;
            }

            try {
                $subject = 'Comment s\'est passé votre séjour ? Laissez-nous votre avis';
                $body = sprintf(
                    "Bonjour %s,\n\nVotre séjour à %s (du %s au %s) est terminé.\n\nVotre avis compte : prenez une minute pour partager votre expérience. Cela aide les futurs voyageurs et les établissements.\n\nCliquez ici pour laisser votre avis :\n%s\n\nCe lien est personnel et valide 90 jours.\n\nMerci,\nL'équipe",
                    $booking->user->name ?? 'client',
                    $booking->accommodation->name ?? 'votre hébergement',
                    $booking->check_in?->format('d/m/Y'),
                    $booking->check_out?->format('d/m/Y'),
                    $reviewUrl
                );

                Mail::raw($body, function ($message) use ($booking, $subject) {
                    $message->to($booking->user->email)->subject($subject);
                });

                $sent++;
                \Log::info('Post-stay review link sent', [
                    'booking_id' => $booking->id,
                    'user_email' => $booking->user->email,
                ]);
            } catch (\Throwable $e) {
                \Log::error('Failed to send post-stay review link', [
                    'booking_id' => $booking->id,
                    'error' => $e->getMessage(),
                ]);
                $this->warn("Erreur envoi booking #{$booking->id}: " . $e->getMessage());
            }
        }

        $this->info("Terminé. Liens envoyés : {$sent}, ignorés : {$skipped}." . ($dryRun ? ' (dry-run)' : ''));
        return 0;
    }
}
