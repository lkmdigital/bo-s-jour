<?php

namespace App\Http\Controllers\Host;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;

class HostInboxController extends Controller
{
    /**
     * Liste des messages reçus (plateforme + voyageurs).
     */
    public function index(Request $request)
    {
        $query = Message::with(['sender:id,name,email'])
            ->where('recipient_id', $request->user()->id)
            ->whereNull('parent_id')
            ->orderByDesc('created_at');

        $messages = $query->paginate($request->get('per_page', 20));

        // Charger les réponses pour chaque message
        $messages->getCollection()->each(function (Message $msg) {
            $msg->load('replies.sender:id,name');
        });

        return response()->json($messages);
    }

    /**
     * Répondre à un message (créer un nouveau message adressé à l'expéditeur).
     */
    public function reply(Request $request)
    {
        $request->validate([
            'parent_id' => 'required|integer|exists:messages,id',
            'body' => 'required|string|max:2000',
        ]);

        $parent = Message::where('id', $request->parent_id)
            ->where('recipient_id', $request->user()->id)
            ->firstOrFail();

        $recipientId = $parent->sender_id;
        if (!$recipientId) {
            return response()->json(['message' => 'Impossible de répondre à un message de la plateforme pour l\'instant.'], 422);
        }

        $message = Message::create([
            'recipient_id' => $recipientId,
            'sender_id' => $request->user()->id,
            'is_from_platform' => false,
            'subject' => 'Re: ' . ($parent->subject ?? 'Message'),
            'body' => $request->body,
            'parent_id' => $parent->id,
        ]);

        $message->load('recipient:id,name');
        return response()->json($message, 201);
    }

    /**
     * Marquer un message comme lu.
     */
    public function markRead(Request $request, int $id)
    {
        $msg = Message::where('id', $id)
            ->where('recipient_id', $request->user()->id)
            ->firstOrFail();

        if (!$msg->read_at) {
            $msg->read_at = now();
            $msg->save();
        }

        return response()->json($msg);
    }
}
