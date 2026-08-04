<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'description_en' => 'nullable|string|max:2000',
            'capacity' => 'required|integer|min:1|max:20',
            'price_per_night' => 'required|numeric|min:0|max:1000000',
            'amenities' => 'nullable|array',
            'amenities.*' => 'string|max:100',
            'bedrooms' => 'required|integer|min:1|max:10',
            'bathrooms' => 'required|integer|min:1|max:10',
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom de la chambre est requis.',
            'name.max' => 'Le nom de la chambre ne peut pas dépasser 255 caractères.',
            'type.required' => 'Le type de chambre est requis.',
            'capacity.required' => 'La capacité est requise.',
            'capacity.min' => 'La capacité doit être d\'au moins 1 personne.',
            'capacity.max' => 'La capacité ne peut pas dépasser 20 personnes.',
            'price_per_night.required' => 'Le prix par nuit est requis.',
            'price_per_night.min' => 'Le prix par nuit doit être positif.',
            'price_per_night.max' => 'Le prix par nuit ne peut pas dépasser 1,000,000 FCFA.',
            'bedrooms.required' => 'Le nombre de chambres est requis.',
            'bathrooms.required' => 'Le nombre de salles de bain est requis.',
        ];
    }
}
