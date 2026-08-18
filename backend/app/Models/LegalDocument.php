<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LegalDocument extends Model
{
    use HasFactory;

    /** Documents gérés par la plateforme — un seul par slug. */
    public const SLUGS = ['cgv', 'cgu', 'confidentialite'];

    public const LABELS = [
        'cgv' => 'Conditions générales de vente',
        'cgu' => "Conditions générales d'utilisation",
        'confidentialite' => 'Politique de confidentialité',
    ];

    protected $fillable = [
        'slug',
        'title',
        'content',
        'version',
        'is_published',
        'published_at',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
