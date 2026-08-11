<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class UserProfileController extends Controller
{
    /**
     * Mise à jour du profil voyageur (infos de base + complétion Phase 5).
     * L'e-mail n'est PAS modifiable ici (changer l'e-mail nécessiterait une revérification).
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            // Identité
            'first_name'            => 'nullable|string|max:255',
            'last_name'             => 'nullable|string|max:255',
            'phone'                 => 'nullable|string|max:20',
            'whatsapp'              => 'nullable|string|max:20',

            // Résidence / stats
            'residence_country'     => 'nullable|string|max:255',
            'residence_city'        => 'nullable|string|max:255',
            'nationality'           => 'nullable|string|max:255',

            // Entreprise (corporate)
            'company_name'          => 'nullable|string|max:255',
            'company_vat'           => 'nullable|string|max:255',
            'company_address'       => 'nullable|string|max:255',
            'company_city'          => 'nullable|string|max:255',
            'company_country'       => 'nullable|string|max:255',
            'company_service'       => 'nullable|string|max:255',
            'company_project'       => 'nullable|string|max:255',
            'company_billing_email' => 'nullable|email|max:255',

            // Étape 17 — personnel
            'date_of_birth'         => 'nullable|date|before:today',
            'gender'                => 'nullable|in:homme,femme,autre,non_precise',
            'profession'            => 'nullable|string|max:255',
            'preferred_language'    => 'nullable|string|max:50',

            // Étape 18 — localisation
            'region'                => 'nullable|string|max:255',
            'commune'               => 'nullable|string|max:255',
            'address_line1'         => 'nullable|string|max:255',

            // Étape 19 — préférences de voyage
            'preferred_accommodation_type' => 'nullable|string|max:100',
            'average_budget'        => 'nullable|integer|min:0',
            'interests'             => 'nullable|array',
            'interests.*'           => 'string|max:50',
            'travel_frequency'      => 'nullable|string|max:50',
            'travel_purpose'        => 'nullable|string|max:50',

            // Étape 20 — communication
            'notif_email'           => 'nullable|boolean',
            'notif_whatsapp'        => 'nullable|boolean',
            'notif_sms'             => 'nullable|boolean',
            'offer_types'           => 'nullable|array',
            'offer_types.*'         => 'string|max:50',
        ]);

        // Nettoyage anti-XSS des champs texte libres
        foreach (['first_name', 'last_name', 'profession', 'company_name', 'company_service', 'company_project', 'region', 'commune', 'address_line1'] as $f) {
            if (array_key_exists($f, $data) && is_string($data[$f])) {
                $data[$f] = strip_tags($data[$f]);
            }
        }

        $user->fill($data);

        // Recomposer le nom complet si prénom/nom fournis
        if ($user->first_name || $user->last_name) {
            $user->name = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->name;
        }

        // Marquer le profil comme complété (indicatif)
        $user->profile_completed = true;
        $user->save();

        return response()->json([
            'message' => 'Profil mis à jour.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Ajout / mise à jour des pièces d'identité du voyageur (KYC).
     * Recto obligatoire ; verso obligatoire pour CNI et Permis (2 faces).
     */
    public function uploadIdentity(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'id_type'            => 'required|string|in:CNI,Passeport,Permis',
            'id_number'          => 'required|string|max:255',
            'id_document_recto'  => 'required|image|mimes:jpeg,jpg,png|max:5120',
            'id_document_verso'  => 'required_if:id_type,CNI,Permis|nullable|image|mimes:jpeg,jpg,png|max:5120',
        ]);

        $user->id_type = $request->id_type;
        $user->id_number = strip_tags($request->id_number);

        if ($request->hasFile('id_document_recto')) {
            if ($user->id_document_recto_path) {
                Storage::disk('public')->delete($user->id_document_recto_path);
            }
            $user->id_document_recto_path = $request->file('id_document_recto')->store('user-documents', 'public');
        }

        if ($request->hasFile('id_document_verso')) {
            if ($user->id_document_verso_path) {
                Storage::disk('public')->delete($user->id_document_verso_path);
            }
            $user->id_document_verso_path = $request->file('id_document_verso')->store('user-documents', 'public');
        }

        // Passeport = 1 seule face : on retire un éventuel verso précédent.
        if ($request->id_type === 'Passeport' && $user->id_document_verso_path) {
            Storage::disk('public')->delete($user->id_document_verso_path);
            $user->id_document_verso_path = null;
        }

        $user->save();

        return response()->json([
            'message'  => 'Pièces d\'identité enregistrées. Elles seront vérifiées par nos équipes.',
            'identity' => $this->identityStatus($user),
        ]);
    }

    /**
     * État des pièces d'identité (pour le front) — expose des URLs, jamais les chemins bruts.
     */
    private function identityStatus($user): array
    {
        return [
            'id_type'        => $user->id_type,
            'id_number'      => $user->id_number,
            'recto_url'      => $user->id_document_recto_path ? Storage::disk('public')->url($user->id_document_recto_path) : null,
            'verso_url'      => $user->id_document_verso_path ? Storage::disk('public')->url($user->id_document_verso_path) : null,
            'verified'       => !empty($user->id_verified_at),
            'submitted'      => !empty($user->id_document_recto_path),
        ];
    }

    /**
     * Changement de mot de passe (utilisateur connecté).
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
}
