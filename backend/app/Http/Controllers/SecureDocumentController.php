<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Sert les documents d'identité/conformité (pièce d'identité, justificatif de domicile,
 * RCCM, document fiscal...) depuis le disque privé ("local", storage/app/private — jamais
 * servi statiquement par Nginx, contrairement au disque "public").
 *
 * Avant ce contrôleur (audit de sécurité externe, 2026-09-27, Phase 6), ces fichiers
 * étaient sur le disque public : leur confidentialité reposait entièrement sur le secret
 * du nom de fichier aléatoire, sans aucun contrôle d'accès réel si l'URL exacte fuitait
 * (historique navigateur, journal d'un intermédiaire réseau, capture d'écran...).
 */
class SecureDocumentController extends Controller
{
    /** Attribut demandé (dans l'URL) => colonne réelle sur le modèle User. */
    private const ALLOWED_FIELDS = [
        'id-document' => 'id_document_path',
        'id-document-recto' => 'id_document_recto_path',
        'id-document-verso' => 'id_document_verso_path',
        'proof-of-address' => 'proof_of_address_path',
        'business-license' => 'business_license_path',
        'rccm-document' => 'rccm_document_path',
        'tax-document' => 'tax_document_path',
    ];

    public function show(Request $request, int $userId, string $field)
    {
        $column = self::ALLOWED_FIELDS[$field] ?? null;
        if (!$column) {
            return response()->json(['message' => 'Document inconnu.'], 404);
        }

        $target = User::findOrFail($userId);
        $this->authorizeAccess($request, $target);

        $path = $target->getAttribute($column);
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'Document introuvable.'], 404);
        }

        // 'inline' : permet l'aperçu (balise <img>) en plus du téléchargement, comme le
        // faisait l'ancienne URL publique.
        return Storage::disk('local')->response($path, null, ['Content-Disposition' => 'inline']);
    }

    private function authorizeAccess(Request $request, User $target): void
    {
        $user = $request->user();

        if ($user && ($user->id === $target->id || $user->isAdmin() || $user->hasRole('super_admin') || $user->hasRole('controleur'))) {
            return;
        }

        abort(403, "Vous n'avez pas accès à ce document.");
    }
}
