<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccommodationAuditLog;
use App\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Journal d'activité — fusionne les deux journaux existants (UserActivityLog,
 * AccommodationAuditLog) en un flux unique consultable par l'admin.
 *
 * Portée honnête : ce journal couvre aujourd'hui les actions admin sur les
 * comptes utilisateurs (création, blocage, rôles...) et le cycle de vie des
 * établissements (création, approbation, rejet...). Les autres actions de la
 * plateforme (réservations, paiements, avis...) n'y sont pas encore tracées.
 */
class AdminActivityLogController extends Controller
{
    /** Nombre de lignes récentes remontées par source avant fusion/tri — large
     * marge pour permettre de paginer sur un historique raisonnable. */
    private const FETCH_CAP = 500;

    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $source = $request->get('source', 'all');
        $entries = collect();

        if (in_array($source, ['all', 'user'], true)) {
            $entries = $entries->merge($this->fetchUserLogs($request));
        }
        if (in_array($source, ['all', 'accommodation'], true)) {
            $entries = $entries->merge($this->fetchAccommodationLogs($request));
        }

        $entries = $entries->sortByDesc('created_at')->values();

        $perPage = (int) $request->get('per_page', 20);
        $page = (int) $request->get('page', 1);
        $paged = $entries->slice(($page - 1) * $perPage, $perPage)->values();

        $paginator = new LengthAwarePaginator($paged, $entries->count(), $perPage, $page);

        return response()->json([
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /** Actions distinctes connues, pour peupler le filtre côté frontend. */
    public function actions(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $userActions = UserActivityLog::query()->distinct()->pluck('action');
        $accommodationActions = AccommodationAuditLog::query()->distinct()->pluck('action');

        return response()->json([
            'data' => $userActions->merge($accommodationActions)->unique()->sort()->values(),
        ]);
    }

    private function fetchUserLogs(Request $request)
    {
        $query = UserActivityLog::with(['user:id,name,email'])->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        return $query->limit(self::FETCH_CAP)->get()->map(fn ($log) => [
            'id' => 'user-' . $log->id,
            'source' => 'user',
            'action' => $log->action,
            'description' => $log->description,
            'actor' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
            'target' => $log->model_type && $log->model_id
                ? ['type' => class_basename($log->model_type), 'id' => $log->model_id]
                : null,
            'ip_address' => $log->ip_address,
            'changes' => array_filter([
                'old' => $log->old_values,
                'new' => $log->new_values,
            ]),
            'created_at' => $log->created_at,
        ]);
    }

    private function fetchAccommodationLogs(Request $request)
    {
        $query = AccommodationAuditLog::with(['user:id,name,email', 'accommodation:id,name'])->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('reason', 'like', '%' . $request->search . '%')
                  ->orWhere('notes', 'like', '%' . $request->search . '%');
            });
        }

        return $query->limit(self::FETCH_CAP)->get()->map(fn ($log) => [
            'id' => 'accommodation-' . $log->id,
            'source' => 'accommodation',
            'action' => $log->action,
            'description' => $log->reason ?: ucfirst($log->action) . ' — ' . ($log->accommodation->name ?? 'établissement supprimé'),
            'actor' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
            'target' => ['type' => 'Accommodation', 'id' => $log->accommodation_id, 'label' => $log->accommodation->name ?? null],
            'ip_address' => $log->ip_address,
            'changes' => array_filter([
                'status_before' => $log->status_before,
                'status_after' => $log->status_after,
                'details' => $log->changes,
                'notes' => $log->notes,
            ]),
            'created_at' => $log->created_at,
        ]);
    }
}
