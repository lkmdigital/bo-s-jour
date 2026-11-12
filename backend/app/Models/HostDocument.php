<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Fichier fourni par un établissement pour un type de document créé par l'admin. */
class HostDocument extends Model
{
    protected $fillable = ['user_id', 'host_document_type_id', 'path'];

    public function type()
    {
        return $this->belongsTo(HostDocumentType::class, 'host_document_type_id')->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
