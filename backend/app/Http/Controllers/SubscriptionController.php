<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\Accommodation;
use Illuminate\Http\Request;
use Carbon\Carbon;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $query = Subscription::with(['accommodation', 'user']);

        if ($request->user()->isHost()) {
            $query->where('user_id', $request->user()->id);
        } elseif ($request->user()->isUser()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $subscriptions = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($subscriptions);
    }

    public function store(Request $request)
    {
        $request->validate([
            'accommodation_id' => 'required|exists:accommodations,id',
            'plan' => 'required|string|in:free,gold,diamond',
            'duration_months' => 'required|integer|min:1|max:12',
        ]);

        $accommodation = Accommodation::findOrFail($request->accommodation_id);

        if ($accommodation->host_id !== $request->user()->hostScopeId() && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Check if there's an active subscription
        $activeSubscription = Subscription::where('accommodation_id', $request->accommodation_id)
            ->where('status', 'active')
            ->where('expires_at', '>=', Carbon::now())
            ->first();

        if ($activeSubscription && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'An active subscription already exists for this accommodation'
            ], 400);
        }

        $startsAt = $activeSubscription ? $activeSubscription->expires_at->addDay() : Carbon::now();
        $expiresAt = $startsAt->copy()->addMonths($request->duration_months);

        // Calculate price based on plan
        $planPrices = [
            'free' => 0,
            'gold' => 50000 * $request->duration_months, // XOF
            'diamond' => 100000 * $request->duration_months, // XOF
        ];

        $subscription = Subscription::create([
            'user_id' => $request->user()->id,
            'accommodation_id' => $request->accommodation_id,
            'plan' => $request->plan,
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'status' => 'active',
            'amount_paid' => $planPrices[$request->plan],
            'payment_method' => 'placeholder', // Will be updated when payment is integrated
            'transaction_id' => 'TXN-' . uniqid(),
        ]);

        return response()->json($subscription->load('accommodation'), 201);
    }

    public function show($id)
    {
        $subscription = Subscription::with(['accommodation', 'user'])->findOrFail($id);
        return response()->json($subscription);
    }

    public function update(Request $request, $id)
    {
        $subscription = Subscription::findOrFail($id);

        if ($subscription->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status' => 'sometimes|string|in:active,expired,cancelled',
        ]);

        $subscription->update($request->only(['status']));

        return response()->json($subscription);
    }

    public function cancel(Request $request, $id)
    {
        $subscription = Subscription::findOrFail($id);

        if ($subscription->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $subscription->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Subscription cancelled successfully']);
    }

    public function mySubscriptions(Request $request)
    {
        $subscriptions = Subscription::where('user_id', $request->user()->id)
            ->with('accommodation')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($subscriptions);
    }
}
