<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'accommodation_id' => 'required|exists:accommodations,id',
            'plan' => 'required|string|in:free,gold,diamond',
            'duration_months' => 'required|integer|min:1|max:12',
        ];
    }

    public function messages(): array
    {
        return [
            'accommodation_id.required' => 'L\'hébergement est requis.',
            'accommodation_id.exists' => 'L\'hébergement sélectionné n\'existe pas.',
            'plan.required' => 'Le plan d\'abonnement est requis.',
            'plan.in' => 'Le plan doit être gratuit, gold ou diamond.',
            'duration_months.required' => 'La durée est requise.',
            'duration_months.min' => 'La durée doit être d\'au moins 1 mois.',
            'duration_months.max' => 'La durée ne peut pas dépasser 12 mois.',
        ];
    }
}
