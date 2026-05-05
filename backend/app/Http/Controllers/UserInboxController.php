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
}
