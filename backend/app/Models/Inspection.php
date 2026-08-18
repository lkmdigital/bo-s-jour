<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Inspections sur site par les contrôleurs
 */
class Inspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'accommodation_id',
        'inspector_id',
        'status',
        'scheduled_at',
        'started_at',
        'paused_at',
        'completed_at',
        'score',
        'result',
        'observations',
        'recommendations',
        'rejection_reason',
        'signature_base64',
        'offline_mode',
        'location_data',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'paused_at' => 'datetime',
        'completed_at' => 'datetime',
        'score' => 'decimal:2',
        'offline_mode' => 'boolean',
        'location_data' => 'array',
    ];

    /**
     * Établissement inspecté
     */
    public function accommodation()
    {
        return $this->belongsTo(Accommodation::class);
    }

    /**
     * Contrôleur qui effectue l'inspection
     */
    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    /**
     * Réponses aux critères de la checklist
     */
    public function responses()
    {
        return $this->hasMany(InspectionResponse::class);
    }

    /**
     * Calculer le score automatiquement
     */
    public function calculateScore(): float
    {
        $responses = $this->responses()->with('checklist')->get();
        $totalWeight = 0;
        $weightedScore = 0;

        foreach ($responses as $response) {
            $checklist = $response->checklist;
            $weight = $checklist->weight;
            $totalWeight += $weight;

            // Calculer le score selon le type
            $score = 0;
            if ($checklist->type === 'boolean') {
                $score = $response->value_boolean ? 100 : 0;
            } elseif ($checklist->type === 'rating') {
                $score = (($response->value_rating ?? 0) / 5) * 100;
            }

            $weightedScore += $score * $weight;
        }

        return $totalWeight > 0 ? round($weightedScore / $totalWeight, 2) : 0;
    }
}

