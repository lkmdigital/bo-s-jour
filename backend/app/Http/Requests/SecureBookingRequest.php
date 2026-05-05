<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Services\SecurityService;

class SecureBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Autorisation gérée dans le contrôleur
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $rules = [
            'accommodation_id' => 'required|exists:accommodations,id',
            'room_id' => 'nullable|exists:rooms,id',
            'check_in' => 'required|date|after:today',
            'check_out' => 'required|date|after:check_in',
            'guests' => 'required|integer|min:1|max:50',
            'special_requests' => 'nullable|string|max:1000',
        ];

        // Si l'utilisateur n'est pas authentifié, ajouter les règles pour les informations utilisateur
        if (!$this->user()) {
            $rules = array_merge($rules, [
                'name' => 'required|string|max:255|regex:/^[a-zA-Z\s\-\']+$/u',
                'email' => 'required|string|email|max:255',
                'phone' => 'required|string|max:20|regex:/^[\+]?[0-9\s\-\(\)]+$/',
                // Nationalité et pièce d'identité ne sont plus obligatoires pour la réservation
                'nationality' => 'nullable|string|max:255',
                'id_type' => 'nullable|string|in:CNI,Passeport,Permis',
                'id_number' => 'nullable|string|max:255|regex:/^[a-zA-Z0-9]+$/',
            ]);
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'accommodation_id.required' => 'L\'hébergement est requis.',
            'accommodation_id.exists' => 'L\'hébergement sélectionné n\'existe pas.',
            'check_in.required' => 'La date d\'arrivée est requise.',
            'check_in.after' => 'La date d\'arrivée doit être dans le futur.',
            'check_out.required' => 'La date de départ est requise.',
            'check_out.after' => 'La date de départ doit être après la date d\'arrivée.',
            'guests.required' => 'Le nombre de voyageurs est requis.',
            'guests.min' => 'Le nombre de voyageurs doit être d\'au moins 1.',
            'guests.max' => 'Le nombre de voyageurs ne peut pas dépasser 50.',
            'name.regex' => 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes.',
            'email.email' => 'L\'adresse email n\'est pas valide.',
            'phone.regex' => 'Le numéro de téléphone n\'est pas valide.',
            'id_number.regex' => 'Le numéro de pièce d\'identité n\'est pas valide.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validation supplémentaire avec SecurityService
            if (!$this->user()) {
                if ($this->has('email') && !SecurityService::validateEmail($this->email)) {
                    $validator->errors()->add('email', 'Format d\'email invalide.');
                }

                if ($this->has('phone') && !SecurityService::validatePhone($this->phone)) {
                    $validator->errors()->add('phone', 'Format de numéro de téléphone invalide.');
                }
            }
        });
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Sanitize les inputs
        if ($this->has('name')) {
            $this->merge(['name' => SecurityService::sanitizeInput($this->name)]);
        }
        
        if ($this->has('special_requests')) {
            $this->merge(['special_requests' => SecurityService::sanitizeInput($this->special_requests)]);
        }
    }
}

