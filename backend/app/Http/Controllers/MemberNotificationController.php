<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class MemberNotificationController extends Controller
{
    /**
     * Liste des notifications du voyageur connecté (les plus récentes d'abord).
     */
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->data['type'] ?? null,
                'message'    => $n->data['message'] ?? null,
                'booking_id' => $n->data['booking_id'] ?? null,
                'data'       => $n->data,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ]);

        return response()->json([
            'data'          => $notifications,
            'unread_count'  => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Marquer une notification comme lue.
     */
    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    /**
     * Marquer toutes les notifications comme lues.
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }
}
