<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PaymentConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public $payment;

    /**
     * Create a new message instance.
     */
    public function __construct(Payment $payment)
    {
        $this->payment = $payment;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Confirmation de paiement - Réservation #' . $this->payment->booking_id)
                    ->view('emails.payment-confirmation')
                    ->with([
                        'payment' => $this->payment,
                        'booking' => $this->payment->booking,
                    ]);
    }
}



