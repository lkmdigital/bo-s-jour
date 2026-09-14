<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Demande utilisateur 2026-09-13/14 : "rajoute une logique de rappel de mise
// à jour des informations pour les établissements non à jour". Distinct du
// système déjà existant (compliance:remind-hosts / RemindHostCompliance) qui
// ne couvre que les DOCUMENTS D'IDENTITÉ de l'hôte (pièce, RCCM, numéro
// contribuable...) — ici c'est la FICHE ÉTABLISSEMENT elle-même (tarifs,
// disponibilités, photos, équipements) qui doit être reconfirmée
// périodiquement, indépendamment du statut de conformité du dossier hôte.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            // Posé quand l'hôte modifie sa fiche OU clique explicitement
            // "Mes informations sont à jour" — NULL tant que jamais confirmé
            // (on retombe alors sur created_at, voir Accommodation::needsInfoUpdate()).
            $table->timestamp('info_confirmed_at')->nullable()->after('updated_at');
            // Évite de renvoyer la relance tous les jours tant que l'hôte n'a
            // pas réagi — voir RemindAccommodationInfoUpdate (délai minimum
            // entre deux relances pour un même établissement).
            $table->timestamp('info_update_reminder_sent_at')->nullable()->after('info_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('accommodations', function (Blueprint $table) {
            $table->dropColumn(['info_confirmed_at', 'info_update_reminder_sent_at']);
        });
    }
};
