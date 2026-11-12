<?php

namespace App\Http\Controllers;

use App\Models\HostDocument;
use App\Models\HostDocumentType;
use App\Services\HostProfileCompletion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Documents à fournir côté établissement : liste des types configurés par l'admin
 * (avec l'état de chacun) et téléversement des types créés par l'admin. Les 5 types
 * historiques continuent d'être téléversés via POST /host/profile. Fichiers sur le disque
 * privé (voir SecureDocumentController), jamais sur le disque public.
 */
class HostDocumentController extends Controller
{
    public function index(Request $request)
    {
        $user = $this->owner($request);
        $user->load('hostDocuments');

        $data = HostDocumentType::active()->map(fn (HostDocumentType $type) => [
            'id' => $type->id,
            'key' => $type->key,
            'label' => $type->label,
            'description' => $type->description,
            'is_required' => $type->is_required,
            'is_custom' => $type->legacy_column === null,
            'provided' => $user->hasHostDocument($type),
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request, $typeId)
    {
        $user = $this->owner($request);

        $type = HostDocumentType::active()->firstWhere('id', (int) $typeId);
        abort_if(!$type || $type->legacy_column !== null, 404, 'Type de document inconnu.');

        $request->validate(['file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120']);

        $existing = HostDocument::where('user_id', $user->id)->where('host_document_type_id', $type->id)->first();
        if ($existing) {
            Storage::disk('local')->delete($existing->path);
        }
        $path = $request->file('file')->store('host-documents', 'local');

        HostDocument::updateOrCreate(
            ['user_id' => $user->id, 'host_document_type_id' => $type->id],
            ['path' => $path]
        );

        $user->unsetRelation('hostDocuments');
        // Même règle que POST /host/profile : le drapeau stocké garde le sens « documents compris ».
        $user->profile_completed = HostProfileCompletion::percentage($user, true) >= 100;
        $user->save();

        return response()->json([
            'message' => 'Document enregistré.',
            'compliance_status' => $user->compliance_status,
            'compliance_requirements' => $user->compliance_requirements,
        ]);
    }

    private function owner(Request $request)
    {
        $user = $request->user();
        abort_unless($user && $user->isHost() && !$user->isStaff(), 403, 'Forbidden');

        return $user;
    }
}
