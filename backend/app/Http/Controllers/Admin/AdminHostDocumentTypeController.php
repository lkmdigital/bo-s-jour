<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HostDocumentType;
use App\Services\PartnerDocuments;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Documents à fournir par les établissements — Paramètres > Documents partenaires.
 * L'admin crée, modifie (libellé, obligatoire/facultatif, actif) et supprime les types.
 *
 * Même règle que l'interrupteur global (PartnerDocuments) : tout administrateur consulte, seul le super
 * administrateur modifie — cocher « obligatoire » change qui peut ajouter un établissement quand l'interrupteur
 * est activé. Le coche ne produit d'effet que si les documents sont globalement obligatoires.
 */
class AdminHostDocumentTypeController extends Controller
{
    public function index(Request $request)
    {
        $types = HostDocumentType::query()
            ->withCount('documents')
            ->orderBy('sort_order')->orderBy('id')
            ->get();

        return response()->json([
            'data' => $types,
            'can_change' => $this->canChange($request),
            'documents_required' => PartnerDocuments::required(),
        ]);
    }

    public function store(Request $request)
    {
        $this->ensureCanChange($request);

        $data = $request->validate([
            'label' => 'required|string|max:150',
            'description' => 'nullable|string|max:255',
            'is_required' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        $type = HostDocumentType::create([
            'key' => $this->uniqueKey($data['label']),
            'label' => $data['label'],
            'description' => $data['description'] ?? null,
            'is_required' => $data['is_required'] ?? false,
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => ((int) HostDocumentType::withTrashed()->max('sort_order')) + 10,
        ]);

        return response()->json(['data' => $type], 201);
    }

    public function update(Request $request, $id)
    {
        $this->ensureCanChange($request);

        $type = HostDocumentType::findOrFail($id);

        $data = $request->validate([
            'label' => 'sometimes|required|string|max:150',
            'description' => 'sometimes|nullable|string|max:255',
            'is_required' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $type->update($data);

        return response()->json(['data' => $type->fresh()]);
    }

    /**
     * Suppression logique : les fichiers déjà fournis par les établissements sont
     * conservés, le type disparaît simplement des exigences et des formulaires.
     */
    public function destroy(Request $request, $id)
    {
        $this->ensureCanChange($request);

        HostDocumentType::findOrFail($id)->delete();

        return response()->json(['message' => 'Type de document supprimé.']);
    }

    private function canChange(Request $request): bool
    {
        return (bool) $request->user()?->hasRole('super_admin');
    }

    private function ensureCanChange(Request $request): void
    {
        abort_unless($this->canChange($request), 403, 'Seul le super administrateur peut modifier les documents demandés.');
    }

    private function uniqueKey(string $label): string
    {
        $base = Str::slug($label, '_') ?: 'document';
        $key = $base;
        $i = 2;
        while (HostDocumentType::withTrashed()->where('key', $key)->exists()) {
            $key = $base . '_' . $i++;
        }

        return $key;
    }
}
