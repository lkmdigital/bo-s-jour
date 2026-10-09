<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La marque s'écrit « boséjour » (retour du 2026-10-09) : corrige les textes déjà enregistrés
 * en base et affichés sur le site (témoignages de l'accueil, paliers de récompense Corporate).
 *
 * Les documents contractuels (CGU/CGV/Confidentialité) ne sont volontairement pas touchés :
 * c'est le texte officiel fourni par le client.
 */
return new class extends Migration
{
    private const COLUMNS = [
        'platform_testimonials' => 'comment',
        'corporate_reward_tiers' => 'reward_label',
    ];

    public function up(): void
    {
        $this->rename('BoSéjour', 'boséjour');
    }

    public function down(): void
    {
        $this->rename('boséjour', 'BoSéjour');
    }

    private function rename(string $from, string $to): void
    {
        foreach (self::COLUMNS as $table => $column) {
            if (! Schema::hasColumn($table, $column)) {
                continue;
            }
            // REPLACE() distingue les majuscules (MySQL comme SQLite) : seules les lignes
            // contenant exactement l'ancienne graphie changent.
            DB::table($table)->update([$column => DB::raw("REPLACE($column, " . DB::getPdo()->quote($from) . ', ' . DB::getPdo()->quote($to) . ')')]);
        }
    }
};
