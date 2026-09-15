<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;

class UserInboxController extends Controller
{
    /**
     * Liste des conversations (messages où l'utilisateur est expéditeur ou destinataire), groupées par thread.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $query = Message::with(['sender:id,name', 'recipient:id,name', 'booking:id,accommodation_id'])
            ->whereNull('parent_id')
            ->where(function ($q) use ($userId) {
                $q->where('sender_id', $userId)->orWhere('recipient_id', $userId);
            })
            ->orderByDesc('created_at');

        $messages = $query->paginate($request->get('per_page', 20));

        $messages->getCollection()->each(function (Message $msg) {
            $msg->load('replies.sender:id,name');
        });

        return response()->json($messages);
    }

    /**
     * Nombre de messages non lus pour l'utilisateur connecté (destinataire).
     */
    public function unreadCount(Request $request)
    {
        $count = Message::where('recipient_id', $request->user()->id)
            ->whereNull('read_at')
            ->whereNull('parent_id')
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    /**
     * Répondre à un message (retour client 2026-09-15 : jusqu'ici seul
     * l'hôte pouvait répondre depuis sa boîte de réception — voir
     * Host/HostInboxController::reply()).
     *
     * Contrairement à la boîte hôte (qui ne liste QUE les messages reçus,
     * donc toujours destinataire de la racine), /user/inbox liste aussi les
     * fils que le voyageur a lui-même démarrés ("Contacter l'établissement",
     * message à un membre du compte entreprise) : il peut donc être
     * expéditeur OU destinataire du message racine. On vérifie qu'il est
     * bien l'une des deux parties, puis on détermine le destinataire en
     * inversant les rôles de la racine plutôt qu'en supposant qu'on est
     * toujours le destinataire.
     */
    public function reply(Request $request)
    {
        $request->validate([
            'parent_id' => 'required|integer|exists:messages,id',
            'body' => 'required|string|max:2000',
        ]);

        $userId = $request->user()->id;
        $root = Message::findOrFail($request->parent_id);

        if ($root->sender_id !== $userId && $root->recipient_id !== $userId) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        $recipientId = $root->sender_id === $userId ? $root->recipient_id : $root->sender_id;
        if (!$recipientId) {
            return response()->json(['message' => 'Impossible de répondre à un message de la plateforme pour l\'instant.'], 422);
        }

        $message = Message::create([
            'recipient_id' => $recipientId,
            'sender_id' => $userId,
            'is_from_platform' => false,
            'subject' => 'Re: ' . ($root->subject ?? 'Message'),
            'body' => $request->body,
            'parent_id' => $root->id,
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
