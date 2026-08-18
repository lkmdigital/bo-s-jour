<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Conformité documentaire des hôtes — Paramètres > Conformité.
 * Le statut est calculé en direct depuis les documents/coordonnées du compte
 * (User::compliance_status / compliance_requirements, déjà utilisés côté
 * fiche établissement) ; ce module en donne une vue agrégée et pilote les
 * relances automatiques (cf. RemindHostCompliance).
 */
class AdminComplianceController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = User::where('role', 'host')->with(['accommodations:id,host_id,name']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $hosts = $query->orderByDesc('created_at')->get();

        // Le statut est un accessor calculé (pas une colonne) : le filtre et la
        // pagination s'appliquent donc en mémoire, après calcul.
        $status = $request->get('status', 'all');
        $mapped = $hosts->map(fn (User $host) => $this->presentHost($host));

        if (in_array($status, ['conforme', 'non_conforme'], true)) {
            $mapped = $mapped->where('compliance_status', $status);
        }

        $mapped = $mapped->values();

        $perPage = (int) $request->get('per_page', 20);
        $page = (int) $request->get('page', 1);
        $paged = $mapped->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $paged,
            'pagination' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($mapped->count() / $perPage)),
                'per_page' => $perPage,
                'total' => $mapped->count(),
            ],
            'summary' => [
                'total' => $hosts->count(),
                'conforme' => $hosts->filter(fn ($h) => $h->compliance_status === 'conforme')->count(),
                'non_conforme' => $hosts->filter(fn ($h) => $h->compliance_status === 'non_conforme')->count(),
            ],
        ]);
    }

    private function presentHost(User $host): array
    {
        return [
            'id' => $host->id,
            'name' => $host->name,
            'email' => $host->email,
            'phone' => $host->phone,
            'created_at' => $host->created_at,
            'days_since_registration' => $host->created_at ? $host->created_at->diffInDays(now()) : null,
            'compliance_status' => $host->compliance_status,
            'compliance_requirements' => $host->compliance_requirements,
            'compliance_reminder_stage' => $host->compliance_reminder_stage,
            'accommodations' => $host->accommodations->map(fn ($a) => ['id' => $a->id, 'name' => $a->name])->values(),
        ];
    }
}
