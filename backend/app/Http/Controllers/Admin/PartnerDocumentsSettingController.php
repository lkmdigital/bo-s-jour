<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PartnerDocuments;
use Illuminate\Http\Request;

/**
 * Réglage « Documents partenaires » : obligatoires ou facultatifs (voir PartnerDocuments).
 * Tout administrateur peut le consulter ; seul le super administrateur peut le modifier.
 */
class PartnerDocumentsSettingController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($this->payload($request->user()));
    }

    public function update(Request $request)
    {
        if (!$request->user()->hasRole('super_admin')) {
            return response()->json(['message' => 'Seul le super administrateur peut modifier ce réglage.'], 403);
        }

        $data = $request->validate(['required' => 'required|boolean']);

        PartnerDocuments::setRequired((bool) $data['required'], $request->user());

        return response()->json($this->payload($request->user()));
    }

    private function payload(User $user): array
    {
        // Ce que l'activation changerait : partenaires dont les documents ou numéros manquent aujourd'hui.
        $hosts = User::where('role', 'host')->whereNull('staff_owner_id')->get();

        return [
            'required' => PartnerDocuments::required(),
            'can_change' => $user->hasRole('super_admin'),
            'last_change' => PartnerDocuments::lastChange(),
            'partners_total' => $hosts->count(),
            'partners_non_compliant' => $hosts->filter(fn (User $h) => $h->compliance_status === 'non_conforme')->count(),
        ];
    }
}
