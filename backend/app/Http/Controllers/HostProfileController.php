<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class HostProfileController extends Controller
{
    public function show(Request $request)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = $request->user();
        
        // Convertir le chemin de l'avatar en URL complète si nécessaire
        if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
            $user->avatar = Storage::url($user->avatar);
        }
        
        // Calculer le pourcentage de complétion
        $completion = $this->calculateCompletion($user);

        return response()->json([
            'user' => $user,
            'completion_percentage' => $completion,
            'is_complete' => $completion >= 100,
            'compliance_status' => $user->compliance_status,
            'compliance_requirements' => $user->compliance_requirements,
        ]);
    }

    public function update(Request $request)
    {
        if (!$request->user()->isHost()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $user = $request->user();

        // Debug: voir ce qui est reçu
        \Log::info('Données reçues pour mise à jour profil', [
            'all' => $request->all(),
            'input' => $request->input(),
            'has_name' => $request->has('name'),
            'name_value' => $request->input('name'),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
        ]);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'date_of_birth' => 'sometimes|date|before:today',
            'bio' => 'sometimes|string|max:1000',
            'address_line1' => 'sometimes|string|max:255',
            'address_line2' => 'sometimes|nullable|string|max:255',
            'city' => 'sometimes|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:20',
            'country' => 'sometimes|string|max:100',
            'phone_fixed' => 'sometimes|nullable|string|max:20',
            'whatsapp' => 'sometimes|nullable|string|max:20',
            'rccm' => 'sometimes|nullable|string|max:255',
            'tax_account_number' => 'sometimes|nullable|string|max:255',
            'id_type' => ['sometimes', 'nullable', Rule::in(['CNI', 'Passeport', 'Permis de conduire', 'Autre'])],
            'id_number' => 'sometimes|nullable|string|max:50',
            'id_document' => 'sometimes|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB - Pour passeport ou document unique
            'avatar' => 'sometimes|file|mimes:jpg,jpeg,png|max:2048', // 2MB pour l'avatar
            'id_document_recto' => 'sometimes|file|mimes:pdf,jpg,jpeg,png|max:5120', // Recto pour CNI/Permis
            'id_document_verso' => 'sometimes|file|mimes:pdf,jpg,jpeg,png|max:5120', // Verso pour CNI/Permis
            'proof_of_address' => 'sometimes|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'business_license' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'rccm_document' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'tax_document' => 'sometimes|nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // Mise à jour des champs texte
        // Utiliser input() au lieu de only() pour FormData
        $updateData = [];
        $fields = ['name', 'phone', 'date_of_birth', 'bio', 'address_line1', 'address_line2', 'city', 'postal_code', 'country', 'phone_fixed', 'whatsapp', 'rccm', 'tax_account_number', 'id_type', 'id_number'];
        
        foreach ($fields as $field) {
            if ($request->has($field)) {
                $value = $request->input($field);
                // Ne pas mettre à jour si la valeur est vide string (sauf pour les champs optionnels)
                if ($value !== '' || in_array($field, ['address_line2', 'postal_code'])) {
                    $updateData[$field] = $value === '' ? null : $value;
                }
            }
        }
        
        if (!empty($updateData)) {
            $user->fill($updateData);
        }

        // Gestion de l'avatar
        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                // Supprimer l'ancien avatar si c'est un chemin relatif
                $oldPath = str_replace('/storage/', '', $user->avatar);
                if (!str_starts_with($oldPath, 'http')) {
                    Storage::disk('public')->delete($oldPath);
                }
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            // Stocker l'URL complète au lieu du chemin relatif
            $user->avatar = Storage::url($path);
        }

        // Gestion des fichiers d'identité
        // Pour Passeport ou Autre : un seul fichier
        if ($request->hasFile('id_document')) {
            if ($user->id_document_path) {
                Storage::disk('public')->delete($user->id_document_path);
            }
            $path = $request->file('id_document')->store('host-documents', 'public');
            $user->id_document_path = $path;
            // Nettoyer les fichiers recto/verso si on utilise un document unique
            if ($user->id_document_recto_path) {
                Storage::disk('public')->delete($user->id_document_recto_path);
                $user->id_document_recto_path = null;
            }
            if ($user->id_document_verso_path) {
                Storage::disk('public')->delete($user->id_document_verso_path);
                $user->id_document_verso_path = null;
            }
        }

        // Pour CNI et Permis : recto et verso séparés
        if ($request->hasFile('id_document_recto')) {
            if ($user->id_document_recto_path) {
                Storage::disk('public')->delete($user->id_document_recto_path);
            }
            $path = $request->file('id_document_recto')->store('host-documents', 'public');
            $user->id_document_recto_path = $path;
            // Nettoyer le document unique si on utilise recto/verso
            if ($user->id_document_path) {
                Storage::disk('public')->delete($user->id_document_path);
                $user->id_document_path = null;
            }
        }

        if ($request->hasFile('id_document_verso')) {
            if ($user->id_document_verso_path) {
                Storage::disk('public')->delete($user->id_document_verso_path);
            }
            $path = $request->file('id_document_verso')->store('host-documents', 'public');
            $user->id_document_verso_path = $path;
            // Nettoyer le document unique si on utilise recto/verso
            if ($user->id_document_path) {
                Storage::disk('public')->delete($user->id_document_path);
                $user->id_document_path = null;
            }
        }

        if ($request->hasFile('proof_of_address')) {
            if ($user->proof_of_address_path) {
                Storage::disk('public')->delete($user->proof_of_address_path);
            }
            $path = $request->file('proof_of_address')->store('host-documents', 'public');
            $user->proof_of_address_path = $path;
        }

        if ($request->hasFile('business_license')) {
            if ($user->business_license_path) {
                Storage::disk('public')->delete($user->business_license_path);
            }
            $path = $request->file('business_license')->store('host-documents', 'public');
            $user->business_license_path = $path;
        }

        if ($request->hasFile('rccm_document')) {
            if ($user->rccm_document_path) {
                Storage::disk('public')->delete($user->rccm_document_path);
            }
            $path = $request->file('rccm_document')->store('host-documents', 'public');
            $user->rccm_document_path = $path;
        }

        if ($request->hasFile('tax_document')) {
            if ($user->tax_document_path) {
                Storage::disk('public')->delete($user->tax_document_path);
            }
            $path = $request->file('tax_document')->store('host-documents', 'public');
            $user->tax_document_path = $path;
        }

        // Recalculer le statut de complétion
        $completion = $this->calculateCompletion($user);
        $user->profile_completed = $completion >= 100;
        
        // Sauvegarder toutes les modifications en une seule fois
        try {
            $user->save();
            
            // Recharger l'utilisateur pour avoir les dernières données
            $user->refresh();
            
            // Convertir le chemin de l'avatar en URL complète si nécessaire
            if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
                $user->avatar = Storage::url($user->avatar);
            }
            
            \Log::info('Profil mis à jour avec succès', [
                'user_id' => $user->id,
                'completion' => $completion,
                'fields_updated' => array_keys($updateData ?? []),
                'request_data' => $request->except(['password', '_token']),
            ]);
            
            return response()->json([
                'message' => 'Profil mis à jour avec succès',
                'user' => $user,
                'completion_percentage' => $completion,
                'is_complete' => $completion >= 100,
                'compliance_status' => $user->compliance_status,
                'compliance_requirements' => $user->compliance_requirements,
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la sauvegarde du profil', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la sauvegarde: ' . $e->getMessage()
            ], 500);
        }
    }

    private function calculateCompletion($user): int
    {
        $requiredFields = [
            'name' => 5,
            'email' => 5,
            'phone' => 10,
            'date_of_birth' => 5,
            'bio' => 5,
            'address_line1' => 10,
            'city' => 5,
            'country' => 5,
            'phone_fixed' => 10,
            'whatsapp' => 10,
            'rccm' => 5,
            'tax_account_number' => 5,
            'id_type' => 10,
            'id_number' => 10,
            'id_document_path' => 15, // Pour passeport ou autre
            'id_document_recto_path' => 7.5, // Pour CNI/Permis (recto)
            'id_document_verso_path' => 7.5, // Pour CNI/Permis (verso)
            'proof_of_address_path' => 15,
            'business_license_path' => 10,
            'rccm_document_path' => 10,
            'tax_document_path' => 10,
        ];

        $total = 0;
        foreach ($requiredFields as $field => $points) {
            $value = $user->getAttribute($field);
            if (!empty($value)) {
                $total += $points;
            }
        }

        // Pour CNI et Permis, vérifier que recto ET verso sont présents
        $idType = $user->getAttribute('id_type');
        if (in_array($idType, ['CNI', 'Permis de conduire'])) {
            $hasRecto = !empty($user->getAttribute('id_document_recto_path'));
            $hasVerso = !empty($user->getAttribute('id_document_verso_path'));
            if ($hasRecto && $hasVerso) {
                // Les deux côtés sont présents, les points sont déjà comptés (7.5 + 7.5 = 15)
                // Tout est bon
            } else {
                // Si seulement un côté est présent ou aucun, on retire les points déjà ajoutés
                // car le document est incomplet
                if ($hasRecto) {
                    $total -= 7.5; // Retirer les points du recto
                }
                if ($hasVerso) {
                    $total -= 7.5; // Retirer les points du verso
                }
            }
        } else {
            // Pour Passeport ou Autre, on utilise id_document_path
            // Les points sont déjà comptés si le fichier existe
        }

        return min(100, $total);
    }
}

