<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Message;
use Illuminate\Http\Request;

class BookingMessageController extends Controller
{
    /**
     * Liste des messages liés à une réservation (voyageur ou hôte de l'hébergement).
     */
    public function index(Request $request, int $id)
    {
        $booking = Booking::with('accommodation')->findOrFail($id);
        $user = $request->user();

        $canAccess = $user->id === $booking->user_id
            || $user->id === $booking->accommodation->host_id;

        if (!$canAccess) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $messages = Message::with(['sender:id,name', 'recipient:id,name'])
            ->where('booking_id', $id)
            ->orderBy('created_at')
            ->get();

        return response()->json($messages);
    }

    /**
     * Envoyer un message dans le fil de la réservation (voyageur → hôte ou hôte → voyageur).
     */
    public function store(Request $request, int $id)
    {
        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $booking = Booking::with('accommodation')->findOrFail($id);
        $user = $request->user();

        $recipientId = null;
        $subject = 'Réservation #' . $id . ' – ' . ($booking->accommodation->name ?? 'Message');

        if ($user->id === $booking->user_id) {
            $recipientId = $booking->accommodation->host_id;
        } elseif ($user->id === $booking->accommodation->host_id) {
            $recipientId = $booking->user_id;
        }

        if (!$recipientId || $recipientId === $user->id) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $message = Message::create([
            'recipient_id' => $recipientId,
            'sender_id' => $user->id,
            'is_from_platform' => false,
            'subject' => $subject,
            'body' => $request->body,
            'booking_id' => $id,
        ]);

        $message->load(['sender:id,name', 'recipient:id,name']);

        return response()->json($message, 201);
    }
}
