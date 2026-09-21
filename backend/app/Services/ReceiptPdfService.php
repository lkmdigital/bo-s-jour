<?php

namespace App\Services;

use App\Models\Booking;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;

/**
 * Reçu de paiement en PDF (joint à l'e-mail de confirmation : le voyageur le
 * garde dans sa boîte, sans dépendre du lien de consultation).
 */
class ReceiptPdfService
{
    public static function forBooking(Booking $booking): ?string
    {
        try {
            $booking->loadMissing(['user', 'accommodation', 'room']);
            $payments = $booking->payments()->where('status', 'completed')->orderBy('paid_at')->get();
            if ($payments->isEmpty()) {
                return null;
            }

            $paid = (float) $payments->sum('amount');
            $total = (float) $booking->total_price;
            // Paiement intégral en ligne : la réduction est visible, le solde est nul.
            $discount = ($booking->payment_type === 'full' && $paid < $total) ? $total - $paid : 0.0;
            $remaining = max(0.0, $total - $paid - $discount);

            $reference = $booking->booking_number ?: '#' . $booking->id;

            return Pdf::loadView('pdf.payment-receipt', [
                'booking' => $booking,
                'accommodation' => $booking->accommodation,
                'payments' => $payments,
                'reference' => $reference,
                'paid' => $paid,
                'discount' => $discount,
                'remaining' => $remaining,
            ])->setPaper('a4')->output();
        } catch (\Throwable $e) {
            Log::error('Receipt PDF generation failed', ['booking_id' => $booking->id, 'error' => $e->getMessage()]);

            return null;
        }
    }
}
