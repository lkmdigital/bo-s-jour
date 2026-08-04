<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'accommodation_id' => 'required|exists:accommodations,id',
            'room_id' => 'nullable|exists:rooms,id',
            'check_in' => [
                'required',
                'date',
                'after:today',
            ],
            'check_out' => [
                'required',
                'date',
                'after:check_in',
            ],
            'guests' => [
                'required',
                'integer',
                'min:1',
                'max:20',
            ],
            'special_requests' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'accommodation_id.required' => 'L\'hébergement est requis.',
            'accommodation_id.exists' => 'L\'hébergement sélectionné n\'existe pas.',
            'room_id.exists' => 'La chambre sélectionnée n\'existe pas.',
            'check_in.required' => 'La date d\'arrivée est requise.',
            'check_in.after' => 'La date d\'arrivée doit être dans le futur.',
            'check_out.required' => 'La date de départ est requise.',
            'check_out.after' => 'La date de départ doit être après la date d\'arrivée.',
            'guests.required' => 'Le nombre de voyageurs est requis.',
            'guests.min' => 'Le nombre de voyageurs doit être d\'au moins 1.',
            'guests.max' => 'Le nombre de voyageurs ne peut pas dépasser 20.',
            'special_requests.max' => 'Les demandes spéciales ne peuvent pas dépasser 1000 caractères.',
        ];
    }
}
