<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Formulaire de la page "Contactez-nous" : le message est transmis par e-mail à
 * l'équipe support (l'adresse de l'expéditeur devient l'adresse de réponse).
 */
class ContactController extends Controller
{
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:255',
            'subject' => 'nullable|string|max:150',
            'message' => 'required|string|min:10|max:3000',
            'website' => 'nullable|string|max:0', // champ piège anti-robot : doit rester vide
        ]);

        $to = config('mail.support_address', 'support@bosejour.ci');
        $subject = '[Contact bosejour.ci] ' . ($data['subject'] ?: 'Nouveau message');
        $body = "De : {$data['name']} <{$data['email']}>\n\n{$data['message']}";

        try {
            Mail::raw($body, function ($mail) use ($to, $subject, $data) {
                $mail->to($to)->replyTo($data['email'], $data['name'])->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error('Contact form mail failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => "Votre message n'a pas pu être envoyé. Écrivez-nous sur WhatsApp ou par e-mail."], 500);
        }

        return response()->json(['message' => 'Merci ! Votre message a bien été envoyé. Nous vous répondrons rapidement.']);
    }
}
